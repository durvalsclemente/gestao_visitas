#!/usr/bin/env bash
# deploy-guard.sh — helper compartilhado para deploy multi-ambiente.
#
# Lê a env var $ENVIRONMENT do shell do operador e exporta variáveis de prefixação
# para os pipelines de cada projeto. Também valida que a branch ativa do repo
# bate com o ambiente em que se está fazendo deploy — aborta com instrução de
# override manual caso haja discrepância.
#
# Mapeamento canônico:
#   ENVIRONMENT vazio | "production" | "prod"        →  produção, prefixos vazios,    branch main|master
#   ENVIRONMENT = "staging"     | "hml"              →  homologação, prefixo "hml-",  branch staging
#   ENVIRONMENT = "development" | "dev"              →  desenvolvimento, prefixo "dev-", branch development
#
# Variáveis exportadas:
#   ENV_NAME             production | staging | development
#   ENV_PREFIX           "" | "hml-" | "dev-"          (usado em namespaces e hosts)
#   ENV_DB_SUFFIX        "" | "_hml" | "_dev"          (usado nos nomes dos bancos)
#   ENV_BRANCH_EXPECTED  pattern regex p/ branch (e.g. "^(main|master)$")
#   ENV_BRANCH_ACTUAL    branch git atual
#   ENV_TLS_CLUSTER_ISSUER   nome do ClusterIssuer de TLS (mesmo nos 3 ambientes)
#
# Uso a partir de um pipeline:
#   source "$(dirname "${BASH_SOURCE[0]}")/deploy-guard.sh"
#   resolve_environment       # popula as vars acima
#   guard_branch_matches      # aborta se branch e ENVIRONMENT divergirem (a menos que DEPLOY_GUARD_BYPASS=1)
#   apply_prefix nome         # echo do nome prefixado conforme ambiente
#
# Override manual:
#   DEPLOY_GUARD_BYPASS=1 bash scripts/pipeline.sh
#
# Localização canônica deste script:
#   /home/khori/src/scripts/deploy-guard.sh   (usuário khori)
# Cada pipeline copia ou source-a a partir de "$REPO_ROOT/scripts/deploy-guard.sh".

set -euo pipefail

# ─── cores ───────────────────────────────────────────────────────────────
_guard_log()  { printf "\033[1;36m[deploy-guard]\033[0m %s\n" "$*" >&2; }
_guard_ok()   { printf "\033[1;32m  ✓\033[0m %s\n" "$*" >&2; }
_guard_warn() { printf "\033[1;33m  ⚠\033[0m %s\n" "$*" >&2; }
_guard_fail() { printf "\033[1;31m  ✗\033[0m %s\n" "$*" >&2; exit 1; }

# ─── resolução do ambiente ───────────────────────────────────────────────
resolve_environment() {
  case "${ENVIRONMENT:-}" in
    ""|"production"|"prod")
      export ENV_NAME="production"
      export ENV_PREFIX=""
      export ENV_DB_SUFFIX=""
      export ENV_BRANCH_EXPECTED="^(main|master)$"
      ;;
    "staging"|"hml")
      export ENV_NAME="staging"
      export ENV_PREFIX="hml-"
      export ENV_DB_SUFFIX="_hml"
      export ENV_BRANCH_EXPECTED="^staging$"
      ;;
    "development"|"dev")
      export ENV_NAME="development"
      export ENV_PREFIX="dev-"
      export ENV_DB_SUFFIX="_dev"
      export ENV_BRANCH_EXPECTED="^development$"
      ;;
    *)
      _guard_fail "ENVIRONMENT desconhecido: '${ENVIRONMENT}'. Aceitos: (vazio)|production|staging|hml|development|dev"
      ;;
  esac

  export ENV_TLS_CLUSTER_ISSUER="${ENV_TLS_CLUSTER_ISSUER:-letsencrypt-prod}"

  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    export ENV_BRANCH_ACTUAL="$(git rev-parse --abbrev-ref HEAD)"
  else
    export ENV_BRANCH_ACTUAL=""
  fi

  _guard_log "ENVIRONMENT='${ENVIRONMENT:-}' → ambiente=${ENV_NAME}, prefixo='${ENV_PREFIX}', db-suffix='${ENV_DB_SUFFIX}', branch-esperada=/${ENV_BRANCH_EXPECTED}/, branch-atual='${ENV_BRANCH_ACTUAL}'"
}

# ─── validação branch × ambiente ─────────────────────────────────────────
guard_branch_matches() {
  if [ -z "${ENV_NAME:-}" ]; then
    _guard_fail "guard_branch_matches chamado sem resolve_environment antes"
  fi

  if [ -z "${ENV_BRANCH_ACTUAL}" ]; then
    _guard_warn "diretório não é git repo — pulando guard de branch (assumindo intencional)"
    return 0
  fi

  if echo "${ENV_BRANCH_ACTUAL}" | grep -qE "${ENV_BRANCH_EXPECTED}"; then
    _guard_ok "branch '${ENV_BRANCH_ACTUAL}' corresponde ao ambiente '${ENV_NAME}' (esperado /${ENV_BRANCH_EXPECTED}/)"
    return 0
  fi

  cat >&2 <<EOF

╔══════════════════════════════════════════════════════════════════════════╗
║  ⛔  DESCREPÂNCIA: branch ≠ ENVIRONMENT                                  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ambiente alvo : ${ENV_NAME}
║  branch esperada (regex) : /${ENV_BRANCH_EXPECTED}/
║  branch atual : ${ENV_BRANCH_ACTUAL}
║
║  O deploy foi ABORTADO por segurança. Opções:
║
║    1) Trocar de branch antes do deploy:
║         git checkout <branch-correta>
║
║    2) Trocar ENVIRONMENT antes do deploy:
║         ENVIRONMENT=<production|staging|development> bash scripts/pipeline.sh
║
║    3) Forçar deploy assim mesmo (USE COM CAUTELA — pode quebrar prod):
║         DEPLOY_GUARD_BYPASS=1 bash scripts/pipeline.sh
║
╚══════════════════════════════════════════════════════════════════════════╝

EOF

  if [ "${DEPLOY_GUARD_BYPASS:-}" = "1" ]; then
    _guard_warn "DEPLOY_GUARD_BYPASS=1 — prosseguindo apesar da discrepância"
    return 0
  fi
  exit 2
}

# ─── helpers de prefixação ───────────────────────────────────────────────
apply_prefix() {
  # echo do nome prefixado: apply_prefix voluntarios → dev-voluntarios em dev,
  # voluntarios em prod, hml-voluntarios em staging.
  printf '%s%s\n' "${ENV_PREFIX}" "$1"
}

apply_db_suffix() {
  # echo do nome de DB com sufixo: apply_db_suffix gestao_visitas → gestao_visitas_dev em dev.
  printf '%s%s\n' "$1" "${ENV_DB_SUFFIX}"
}

# ─── render_manifest ─────────────────────────────────────────────────────
# Recebe um caminho de manifest k8s + nome do namespace prod (ex.: "voluntarios")
# + um ou mais hosts prod (ex.: "voluntario.osc.app.br") e faz sed em stdin/stdout
# para reescrever namespace, hosts e os secretNames de TLS para a versão
# prefixada do ambiente atual.
#
# Uso: render_manifest <arquivo> <ns-prod> <host-prod-1> [<host-prod-2> ...] | kubectl apply -f -
render_manifest() {
  local file="$1"; shift
  local ns_prod="$1"; shift
  local hosts=("$@")

  local sed_args=()

  # 1) namespace exato: "namespace: <ns_prod>" — sem ancorar linha porque os manifests
  #    de visitas/contratacoes usam YAML inline tipo `metadata: { name: X, namespace: Y }`.
  #    Garantimos boundary do lado direito com [^a-zA-Z0-9_-].
  sed_args+=( -e "s|namespace:[[:space:]]*${ns_prod}\([^a-zA-Z0-9_-]\)|namespace: ${ENV_PREFIX}${ns_prod}\1|g" )
  sed_args+=( -e "s|namespace:[[:space:]]*${ns_prod}\$|namespace: ${ENV_PREFIX}${ns_prod}|g" )
  # Caso especial: o `name:` do Namespace resource (não recurso aninhado em outro spec).
  # Pegamos só linhas onde `name:` aparece sozinho no início da linha (top-level metadata).
  sed_args+=( -e "s|^\([[:space:]]*name:[[:space:]]*\)${ns_prod}[[:space:]]*\$|\1${ENV_PREFIX}${ns_prod}|g" )

  # 2) hosts: trocar cada hostname prod por sua versão prefixada.
  #    IMPORTANTE: escapar os pontos no padrão (sed BRE trata `.` como "qualquer char",
  #    o que faria `auth.osc.app.br` casar com `auth-osc-app-br` dentro de secretNames).
  for h in "${hosts[@]}"; do
    local h_prefixed="${ENV_PREFIX}${h}"
    local h_escaped="$(echo "${h}" | sed 's/\./\\./g')"
    local tls_secret_prod="$(echo "${h}" | tr '.' '-')-tls"
    local tls_secret_new="$(echo "${h_prefixed}" | tr '.' '-')-tls"
    sed_args+=( -e "s|${h_escaped}|${h_prefixed}|g" )
    sed_args+=( -e "s|${tls_secret_prod}|${tls_secret_new}|g" )
  done

  sed "${sed_args[@]}" "${file}"
}


# ─── kubeconfig padronizado ──────────────────────────────────────────────
# Kubeconfig: usa $KUBECONFIG do operador; se vazio, prefere $HOME/.kube/config
# (cópia legível pelo usuário khori) e cai pro path snap como último recurso.
if [ -z "${KUBECONFIG:-}" ]; then
  if [ -r "$HOME/.kube/config" ]; then
    export KUBECONFIG="$HOME/.kube/config"
  else
    export KUBECONFIG="/var/snap/microk8s/current/credentials/client.config"
  fi
fi

# DOCKER_CMD: prefere `docker` direto se o usuário pertence ao grupo docker e
# o socket é acessível; senão usa `sudo -n docker` (NOPASSWD via sudoers).
if [ -z "${DOCKER_CMD:-}" ]; then
  if docker info >/dev/null 2>&1; then
    export DOCKER_CMD="docker"
  elif sudo -n docker info >/dev/null 2>&1; then
    export DOCKER_CMD="sudo -n docker"
  else
    export DOCKER_CMD="docker"  # vai falhar com mensagem clara, sem swallow
  fi
fi

# Quem chamar este script com `bash deploy-guard.sh status` apenas reporta sem mais nada
if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  case "${1:-status}" in
    status)
      resolve_environment
      _guard_ok "ENVIRONMENT=${ENVIRONMENT:-(vazio)} → ambiente=${ENV_NAME}, prefixo='${ENV_PREFIX}', branch='${ENV_BRANCH_ACTUAL}'"
      ;;
    *)
      echo "Uso: ENVIRONMENT=<value> bash deploy-guard.sh status"
      exit 1
      ;;
  esac
fi
