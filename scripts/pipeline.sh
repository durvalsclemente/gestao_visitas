#!/usr/bin/env bash
# Pipeline multi-ambiente do gestao_visitas.
# Veja Central_Acessos/scripts/pipeline.sh para a referência completa do padrão.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=./deploy-guard.sh
source "$ROOT/scripts/deploy-guard.sh"
resolve_environment
guard_branch_matches

REGISTRY=${REGISTRY:-localhost:32000}
TAG=${TAG:-$(date -u +%Y%m%d%H%M%S)}
NS="$(apply_prefix visitas)"
HOST_APP="$(apply_prefix visitas.osc.app.br)"
HOST_AUTH="$(apply_prefix auth.osc.app.br)"
IMG_API="${REGISTRY}/$(apply_prefix visitas-api)"
IMG_WEB="${REGISTRY}/$(apply_prefix visitas-web)"

log()  { printf "\033[1;36m[visitas:%s]\033[0m %s\n" "${ENV_NAME}" "$*"; }
ok()   { printf "\033[1;32m  ✓\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m  ✗\033[0m %s\n" "$*"; exit 1; }

build_and_push() {
  log "Build TAG=$TAG host=$HOST_APP"
  git submodule update --init --recursive --remote
  $DOCKER_CMD build -f apps/api/Dockerfile -t "$IMG_API:$TAG" .       2>&1 | tail -5
  $DOCKER_CMD build -f apps/web/Dockerfile -t "$IMG_WEB:$TAG" \
    --build-arg VITE_API_BASE_URL="https://${HOST_APP}/api" \
    --build-arg VITE_CENTRAL_URL="https://${HOST_AUTH}" \
    --build-arg VITE_CENTRAL_WEB_URL="https://${HOST_AUTH}" \
    --build-arg VITE_CLIENT_ID=gestao-visitas .                   2>&1 | tail -5
  ok "imagens construídas"
  $DOCKER_CMD push "$IMG_API:$TAG" 2>&1 | tail -2
  $DOCKER_CMD push "$IMG_WEB:$TAG" 2>&1 | tail -2
  ok "push concluído"
}

apply_prelude() {
  render_manifest k8s/00-namespace.yaml visitas | kubectl apply -f -
  kubectl -n "$NS" get secret visitas-secret >/dev/null 2>&1 || fail "rode ENVIRONMENT=${ENVIRONMENT:-} bash scripts/gen-secrets.sh primeiro"
  kubectl -n "$NS" get secret osc-token-encryption-key >/dev/null 2>&1 || fail "osc-token-encryption-key faltando em $NS"
  render_manifest k8s/12-configmap.yaml visitas "visitas.osc.app.br" "auth.osc.app.br" | kubectl apply -f -
  ok "namespace/configmap/secrets prontos em ns=$NS"
}

run_pod() {
  local name=$1; shift; local image=$1; shift
  kubectl -n "$NS" delete pod "$name" --ignore-not-found --grace-period=0 --force >/dev/null 2>&1 || true
  kubectl -n "$NS" run "$name" --image="$image" --restart=Never \
    --env="DATABASE_URL=$(kubectl -n "$NS" get secret visitas-secret -o jsonpath='{.data.DATABASE_URL}' | base64 -d)" \
    --command -- "$@" >/dev/null
  local p=""
  for i in $(seq 1 20); do
    p=$(kubectl -n "$NS" get pod "$name" -o jsonpath='{.status.phase}' 2>/dev/null)
    [ "$p" = "Succeeded" ] && break
    [ "$p" = "Failed" ] && break
    sleep 4
  done
  kubectl -n "$NS" logs "$name" --tail=12 2>&1 | sed 's/^/    /'
  kubectl -n "$NS" delete pod "$name" --ignore-not-found --grace-period=0 --force >/dev/null 2>&1 || true
  [ "$p" = "Succeeded" ]
}

migrate_db() {
  log "Prisma migrate deploy"
  if run_pod "migrate-$TAG" "$IMG_API:$TAG" npx --no-install prisma migrate deploy; then
    ok "migrate concluído"
  else
    fail "migrate falhou"
  fi
}

apply_manifests() {
  log "Apply Deployments/Services/Ingresses (TAG=$TAG)"
  for f in 20-deployment-api.yaml 21-service-api.yaml 22-ingress-api.yaml \
           30-deployment-web.yaml 31-service-web.yaml 32-ingress-web.yaml; do
    render_manifest "k8s/$f" visitas "visitas.osc.app.br" \
      | sed \
        -e "s|localhost:32000/visitas-api:CHANGE_ME|$IMG_API:$TAG|g" \
        -e "s|localhost:32000/visitas-web:CHANGE_ME|$IMG_WEB:$TAG|g" \
      | kubectl apply -f -
  done
  kubectl -n "$NS" rollout status deployment/visitas-api --timeout=180s
  kubectl -n "$NS" rollout status deployment/visitas-web --timeout=120s
  ok "rollouts concluídos"
}

smoke() {
  local CURL_API="curl -sk --resolve ${HOST_APP}:443:127.0.0.1"
  local CURL_WEB="$CURL_API"
  local BASE="https://${HOST_APP}"

  log "Smoke — api /health em $BASE"
  for i in 1 2 3 4 5; do
    if $CURL_API -o /dev/null -w "%{http_code}" "$BASE/api/health" 2>/dev/null | grep -q 200; then
      ok "api /health 200"; break
    fi
    [ "$i" = 5 ] && fail "/health não respondeu"
    sleep 3
  done
  log "Smoke — Bearer ausente em /assistidos rejeitado (401/403)"
  CODE=$($CURL_API -o /dev/null -w "%{http_code}" "$BASE/api/assistidos")
  case "$CODE" in 401|403) ok "/assistidos sem token = $CODE" ;; *) fail "esperava 401/403, recebi $CODE" ;; esac
  log "Smoke — web home"
  CODE=$($CURL_WEB -o /dev/null -w "%{http_code}" "$BASE/")
  [ "$CODE" = "200" ] && ok "web 200" || fail "web retornou $CODE"
  log "Smoke — Certs"
  kubectl -n "$NS" get certificate -o wide 2>&1 | head -5
}

case "${1:-all}" in
  skip-build) apply_prelude; migrate_db; apply_manifests; smoke ;;
  smoke)      smoke ;;
  build-only) build_and_push ;;
  *)          build_and_push; apply_prelude; migrate_db; apply_manifests; smoke ;;
esac
log "Pipeline visitas concluída · ENV=${ENV_NAME} · TAG=$TAG · NS=$NS · HOST=$HOST_APP"
