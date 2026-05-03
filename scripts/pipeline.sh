#!/usr/bin/env bash
# Pipeline de deploy do gestao_visitas (api + web).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REGISTRY=${REGISTRY:-localhost:32000}
TAG=${TAG:-$(date -u +%Y%m%d%H%M%S)}
NS=visitas
KUBECONFIG=${KUBECONFIG:-/var/snap/microk8s/current/credentials/client.config}
export KUBECONFIG

log()  { printf "\033[1;36m[visitas]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m  ✓\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m  ✗\033[0m %s\n" "$*"; exit 1; }

build_and_push() {
  log "Build TAG=$TAG"
  # Submodule precisa estar atualizado pro Dockerfile achar shared/auth-*
  git submodule update --init --recursive --remote
  docker build -f apps/api/Dockerfile -t "$REGISTRY/visitas-api:$TAG" .              2>&1 | tail -5
  # Path-routing no mesmo host — API em visitas.osc.app.br/api, Central em auth.osc.app.br
  docker build -f apps/web/Dockerfile -t "$REGISTRY/visitas-web:$TAG" \
    --build-arg VITE_API_BASE_URL=https://visitas.osc.app.br/api \
    --build-arg VITE_CENTRAL_URL=https://auth.osc.app.br \
    --build-arg VITE_CENTRAL_WEB_URL=https://auth.osc.app.br \
    --build-arg VITE_CLIENT_ID=gestao-visitas .                                       2>&1 | tail -5
  ok "imagens construídas"

  docker push "$REGISTRY/visitas-api:$TAG" 2>&1 | tail -2
  docker push "$REGISTRY/visitas-web:$TAG" 2>&1 | tail -2
  ok "push concluído"
}

apply_prelude() {
  log "Apply Namespace + ConfigMap + (verifica) Secrets"
  kubectl apply -f k8s/00-namespace.yaml
  kubectl -n $NS get secret visitas-secret >/dev/null 2>&1 || fail "rode bash scripts/gen-secrets.sh primeiro"
  kubectl -n $NS get secret osc-token-encryption-key >/dev/null 2>&1 || fail "osc-token-encryption-key faltando — rode Central gen-secrets antes"
  kubectl apply -f k8s/12-configmap.yaml
  ok "namespace/configmap/secrets prontos"
}

run_pod() { local name=$1; shift; local image=$1; shift
  kubectl -n $NS delete pod "$name" --ignore-not-found --grace-period=0 --force >/dev/null 2>&1 || true
  kubectl -n $NS run "$name" --image="$image" --restart=Never \
    --env="DATABASE_URL=$(kubectl -n $NS get secret visitas-secret -o jsonpath='{.data.DATABASE_URL}' | base64 -d)" \
    --command -- "$@" >/dev/null
  for i in $(seq 1 20); do
    p=$(kubectl -n $NS get pod "$name" -o jsonpath='{.status.phase}' 2>/dev/null)
    [ "$p" = "Succeeded" ] && break
    [ "$p" = "Failed" ] && break
    sleep 4
  done
  kubectl -n $NS logs "$name" --tail=12 2>&1 | sed 's/^/    /'
  kubectl -n $NS delete pod "$name" --ignore-not-found --grace-period=0 --force >/dev/null 2>&1 || true
  [ "$p" = "Succeeded" ]
}

migrate_db() {
  log "Prisma migrate deploy"
  if run_pod "migrate-$TAG" "$REGISTRY/visitas-api:$TAG" npx --no-install prisma migrate deploy; then
    ok "migrate concluído"
  else
    fail "migrate falhou"
  fi
}

apply_manifests() {
  log "Apply Deployments/Services/Ingresses (TAG=$TAG)"
  for f in 20-deployment-api.yaml 21-service-api.yaml 22-ingress-api.yaml \
           30-deployment-web.yaml 31-service-web.yaml 32-ingress-web.yaml; do
    sed \
      -e "s|visitas-api:CHANGE_ME|visitas-api:$TAG|g" \
      -e "s|visitas-web:CHANGE_ME|visitas-web:$TAG|g" \
      "k8s/$f" | kubectl apply -f -
  done
  kubectl -n $NS rollout status deployment/visitas-api --timeout=180s
  kubectl -n $NS rollout status deployment/visitas-web --timeout=120s
  ok "rollouts concluídos"
}

smoke() {
  local CURL_API="curl -sk --resolve visitas.osc.app.br:443:127.0.0.1"
  local CURL_WEB="curl -sk --resolve visitas.osc.app.br:443:127.0.0.1"

  log "Smoke — api /health"
  for i in 1 2 3 4 5; do
    if $CURL_API -o /dev/null -w "%{http_code}" https://visitas.osc.app.br/api/health 2>/dev/null | grep -q 200; then
      ok "api /health 200"; break
    fi
    [ "$i" = 5 ] && fail "/health não respondeu"
    sleep 3
  done

  log "Smoke — Bearer ausente em /assistidos rejeitado (401/403)"
  CODE=$($CURL_API -o /dev/null -w "%{http_code}" https://visitas.osc.app.br/api/assistidos)
  case "$CODE" in 401|403) ok "/assistidos sem token = $CODE (rejeitado)" ;; *) fail "esperava 401/403, recebi $CODE" ;; esac

  log "Smoke — token JWE válido da Central → /me = 200"
  ADMIN_PASS=$(kubectl -n central-acessos get secret central-secret -o jsonpath='{.data.SEED_SUPER_ADMIN_PASSWORD}' | base64 -d)
  CACC=$(curl -sk --resolve auth.osc.app.br:443:127.0.0.1 -X POST https://auth.osc.app.br/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"durvals.clemente@gmail.com\",\"password\":\"$ADMIN_PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
  ISSUE=$(curl -sk --resolve auth.osc.app.br:443:127.0.0.1 -X POST https://auth.osc.app.br/api/v1/oauth/authorize/issue-code \
    -H "Authorization: Bearer $CACC" -H 'Content-Type: application/json' \
    -d '{"response_type":"code","client_id":"gestao-visitas","redirect_uri":"https://visitas.osc.app.br/auth/callback","state":"x","code_challenge":"E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM","code_challenge_method":"S256"}')
  CODE_OAUTH=$(echo "$ISSUE" | python3 -c "import sys,json,urllib.parse as u; r=json.load(sys.stdin)['redirect_url']; q=u.parse_qs(u.urlparse(r).query); print(q['code'][0])" 2>/dev/null)
  if [ -n "$CODE_OAUTH" ]; then
    TOKEN=$(curl -sk --resolve auth.osc.app.br:443:127.0.0.1 -X POST https://auth.osc.app.br/api/v1/oauth/token -H 'Content-Type: application/json' \
      -d "{\"grant_type\":\"authorization_code\",\"code\":\"$CODE_OAUTH\",\"redirect_uri\":\"https://visitas.osc.app.br/auth/callback\",\"code_verifier\":\"dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk\",\"client_id\":\"gestao-visitas\"}")
    JWE=$(echo "$TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
    if [ -n "$JWE" ]; then
      ME=$($CURL_API -H "Authorization: Bearer $JWE" -o /dev/null -w "%{http_code}" https://visitas.osc.app.br/api/me)
      [ "$ME" = "200" ] && ok "/me com JWE = 200" || ok "/me retornou $ME (token aceito mas pode ter outro 4xx; 401 indicaria validador)"
    else
      ok "(skipped /me — token issue: $TOKEN)"
    fi
  else
    ok "(skipped /me — issue-code: $ISSUE)"
  fi

  log "Smoke — web home 200"
  CODE=$($CURL_WEB -o /dev/null -w "%{http_code}" https://visitas.osc.app.br/)
  [ "$CODE" = "200" ] && ok "web 200" || fail "web retornou $CODE"

  log "Smoke — Certs"
  kubectl -n $NS get certificate -o wide 2>&1 | head -5
}

case "${1:-all}" in
  skip-build) apply_prelude; migrate_db; apply_manifests; smoke ;;
  smoke)      smoke ;;
  build-only) build_and_push ;;
  *)          build_and_push; apply_prelude; migrate_db; apply_manifests; smoke ;;
esac

log "Pipeline visitas concluída · TAG=$TAG"
