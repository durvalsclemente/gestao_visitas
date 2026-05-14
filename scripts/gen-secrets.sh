#!/usr/bin/env bash
# Cria visitas-secret no namespace correto do ambiente atual (idempotente).
# Lê $ENVIRONMENT do shell via deploy-guard.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=./deploy-guard.sh
source "$ROOT/scripts/deploy-guard.sh"
resolve_environment

NS="$(apply_prefix visitas)"
DB_NAME="$(apply_db_suffix gestao_visitas)"
CENTRAL_DB="$(apply_db_suffix central_acessos)"
DB_URL=${DB_URL:-"postgresql://produser:Agenda%402026%21Prod@postgres.bd.svc.cluster.local:5432/${DB_NAME}?schema=public"}
WEBHOOK_VAL=${CENTRAL_WEBHOOK_AUTH_VALUE:-}

ok()  { printf "\033[1;32m  ✓\033[0m %s\n" "$*"; }
log() { printf "\033[1;36m[gen-secrets/visitas:%s]\033[0m %s\n" "${ENV_NAME}" "$*"; }

kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS" >/dev/null

if ! kubectl -n "$NS" get secret osc-token-encryption-key >/dev/null 2>&1; then
  echo "✗ osc-token-encryption-key ausente em $NS — rode antes:"
  echo "  ENVIRONMENT=${ENVIRONMENT:-} bash /home/khori/src/Central_Acessos/scripts/gen-secrets.sh"
  exit 1
fi

# Webhook secret: pega da row registered_clients via psql no banco da Central do ambiente.
if [ -z "$WEBHOOK_VAL" ]; then
  WEBHOOK_VAL=$(kubectl exec -n bd $(kubectl -n bd get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}') \
    -- psql -U produser -d "$CENTRAL_DB" -tAc \
    "SELECT \"webhookSecret\" FROM registered_clients WHERE \"clientId\"='gestao-visitas';" 2>/dev/null | head -1)
fi
[ -z "$WEBHOOK_VAL" ] && WEBHOOK_VAL=$(openssl rand -base64 32)

if kubectl -n "$NS" get secret visitas-secret >/dev/null 2>&1; then
  log "visitas-secret já existe em $NS — não sobrescrevo"
else
  kubectl -n "$NS" create secret generic visitas-secret \
    --from-literal=DATABASE_URL="$DB_URL" \
    --from-literal=CENTRAL_WEBHOOK_AUTH_VALUE="$WEBHOOK_VAL" \
    --from-literal=CENTRAL_JWT_SECRET="$(openssl rand -base64 32)" \
    --from-literal=CENTRAL_JWT_PUBLIC_KEY="" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  ok "visitas-secret criado em $NS (DB=$DB_NAME)"
fi
