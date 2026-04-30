#!/usr/bin/env bash
# Idempotente. Roda após `pnpm install` e `git submodule update --init` para
# popular os node_modules do `.central-shared/shared/packages/auth-*` com os
# peer deps que vivem em apps/api/node_modules (jose, @nestjs/common, etc.).
#
# Em CI/Docker chamar antes do `nest start`/`nest build`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHARED="$ROOT/.central-shared/shared/packages"
API_NM="$ROOT/apps/api/node_modules"

mkdir -p "$API_NM/@osc"
ln -sfn "$SHARED/auth-core"     "$API_NM/@osc/auth-core"
ln -sfn "$SHARED/auth-nest"     "$API_NM/@osc/auth-nest"
ln -sfn "$SHARED/auth-fastify"  "$API_NM/@osc/auth-fastify"

# auth-core precisa de `jose` em runtime
mkdir -p "$SHARED/auth-core/node_modules"
ln -sfn "$API_NM/jose" "$SHARED/auth-core/node_modules/jose"

# auth-fastify também (re-export do core mas alguns adapters precisam direto)
mkdir -p "$SHARED/auth-fastify/node_modules"
ln -sfn "$API_NM/jose" "$SHARED/auth-fastify/node_modules/jose"

# auth-nest precisa de @nestjs/common, @nestjs/core, reflect-metadata
mkdir -p "$SHARED/auth-nest/node_modules/@nestjs"
ln -sfn "$API_NM/@nestjs/common"     "$SHARED/auth-nest/node_modules/@nestjs/common"
ln -sfn "$API_NM/@nestjs/core"       "$SHARED/auth-nest/node_modules/@nestjs/core"
ln -sfn "$API_NM/reflect-metadata"   "$SHARED/auth-nest/node_modules/reflect-metadata"

echo "✓ central-shared symlinks ready"
