#!/usr/bin/env bash
# Cria visitas-secret se ainda não existir.
#  - DATABASE_URL                 → postgres do cluster
#  - CENTRAL_WEBHOOK_AUTH_VALUE   → segredo HMAC do RegisteredClient na Central
#  - CENTRAL_JWT_SECRET           → fallback HS256 (legacy do env.validation; opcional em RS256)
# osc-token-encryption-key é replicado pelo gen-secrets do Central. Se ainda não existir,
# este script aborta e instrui rodar lá primeiro.
set -euo pipefail
KUBECONFIG=${KUBECONFIG:-/var/snap/microk8s/current/credentials/client.config}
export KUBECONFIG

NS=visitas
DB_URL=${DB_URL:-"postgresql://produser:Agenda%402026%21Prod@postgres.bd.svc.cluster.local:5432/gestao_visitas?schema=public"}
WEBHOOK_VAL=${CENTRAL_WEBHOOK_AUTH_VALUE:-}

ok()  { printf "\033[1;32m  ✓\033[0m %s\n" "$*"; }
log() { printf "\033[1;36m[gen-secrets/visitas]\033[0m %s\n" "$*"; }

kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS" >/dev/null

if ! kubectl -n "$NS" get secret osc-token-encryption-key >/dev/null 2>&1; then
  echo "✗ osc-token-encryption-key ausente em $NS — rode antes:"
  echo "  bash /root/src/Central_Acessos/scripts/gen-secrets.sh"
  exit 1
fi

# Webhook secret: pega da row registered_clients via psql
if [ -z "$WEBHOOK_VAL" ]; then
  WEBHOOK_VAL=$(kubectl exec -n bd $(kubectl -n bd get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}') \
    -- psql -U produser -d central_acessos -tAc \
    "SELECT \"webhookSecret\" FROM registered_clients WHERE \"clientId\"='gestao-visitas';" 2>/dev/null | head -1)
fi
[ -z "$WEBHOOK_VAL" ] && WEBHOOK_VAL=$(openssl rand -base64 32)

if kubectl -n "$NS" get secret visitas-secret >/dev/null 2>&1; then
  log "visitas-secret já existe — não sobrescrevo"
else
  kubectl -n "$NS" create secret generic visitas-secret \
    --from-literal=DATABASE_URL="$DB_URL" \
    --from-literal=CENTRAL_WEBHOOK_AUTH_VALUE="$WEBHOOK_VAL" \
    --from-literal=CENTRAL_JWT_SECRET="$(openssl rand -base64 32)" \
    --from-literal=CENTRAL_JWT_PUBLIC_KEY="" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  ok "visitas-secret criado"
fi
