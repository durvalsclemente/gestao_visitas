# syntax=docker/dockerfile:1.6
# Build: contexto = raiz do repo (precisa de apps/api + .central-shared/shared/packages/auth-{core,nest})

FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

# 1) Compila @osc/auth-core (shared) — autônomo
WORKDIR /app/.central-shared/shared/packages/auth-core
COPY .central-shared/shared/packages/auth-core/package.json .central-shared/shared/packages/auth-core/tsconfig.build.json ./
COPY .central-shared/shared/packages/auth-core/src ./src
RUN npm install --no-audit --no-fund jose typescript @types/node 2>&1 | tail -3 \
 && npx tsc -p tsconfig.build.json \
 && ls dist/index.js

# 2) Setup auth-nest source — compilação acontece após API ter @nestjs/* instalado
WORKDIR /app/.central-shared/shared/packages/auth-nest
COPY .central-shared/shared/packages/auth-nest/package.json .central-shared/shared/packages/auth-nest/tsconfig.build.json ./
COPY .central-shared/shared/packages/auth-nest/src ./src

# 3) API — instala deps (@nestjs/*, prisma, etc.)
WORKDIR /app/apps/api
COPY apps/api/package.json apps/api/package-lock.json* ./
COPY pnpm-lock.yaml /app/pnpm-lock.yaml
RUN npm install --no-audit --no-fund

# 4) Compila auth-nest reusando apps/api/node_modules (tem @nestjs/* + tsc)
WORKDIR /app/.central-shared/shared/packages/auth-nest
RUN mkdir -p node_modules/@osc node_modules/@nestjs \
 && ln -sfn /app/.central-shared/shared/packages/auth-core node_modules/@osc/auth-core \
 && ln -sfn /app/apps/api/node_modules/@nestjs/common  node_modules/@nestjs/common \
 && ln -sfn /app/apps/api/node_modules/@nestjs/core    node_modules/@nestjs/core \
 && ln -sfn /app/apps/api/node_modules/reflect-metadata node_modules/reflect-metadata \
 && ln -sfn /app/apps/api/node_modules/rxjs            node_modules/rxjs \
 && ln -sfn /app/apps/api/node_modules/typescript      node_modules/typescript \
 && ln -sfn /app/apps/api/node_modules/@types          node_modules/@types \
 && /app/apps/api/node_modules/.bin/tsc -p tsconfig.build.json \
 && ls dist/index.js

# 5) API source + symlinks
WORKDIR /app/apps/api
COPY apps/api/tsconfig.json apps/api/nest-cli.json ./
COPY apps/api/prisma ./prisma
COPY apps/api/src ./src
RUN mkdir -p node_modules/@osc \
 && ln -sfn /app/.central-shared/shared/packages/auth-core node_modules/@osc/auth-core \
 && ln -sfn /app/.central-shared/shared/packages/auth-nest node_modules/@osc/auth-nest \
 && mkdir -p /app/.central-shared/shared/packages/auth-core/node_modules \
 && ln -sfn /app/apps/api/node_modules/jose /app/.central-shared/shared/packages/auth-core/node_modules/jose

RUN npx prisma generate
# Build do API em transpile-only via swc — drift TS pre-existente (CLAUDE.md). Emite dist/*.js.
RUN npm install --no-audit --no-fund --no-save --silent @swc/cli @swc/core >/dev/null 2>&1
RUN cat > /tmp/.swcrc <<'EOF'
{
  "jsc": {
    "parser": { "syntax": "typescript", "decorators": true },
    "transform": { "legacyDecorator": true, "decoratorMetadata": true },
    "target": "es2021"
  },
  "module": { "type": "commonjs" }
}
EOF
RUN npx swc src --out-dir dist --strip-leading-paths --config-file /tmp/.swcrc \
 && [ -f dist/main.js ] || (echo "swc não emitiu dist/main.js"; ls dist; exit 1)

# ─── runtime ────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/api
ENV NODE_ENV=production

COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/apps/api/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

# Shared lib compilada (auth-core + auth-nest com dist/) + symlinks
COPY --from=builder /app/.central-shared/shared/packages/auth-core/dist /app/.central-shared/shared/packages/auth-core/dist
COPY --from=builder /app/.central-shared/shared/packages/auth-core/package.json /app/.central-shared/shared/packages/auth-core/package.json
COPY --from=builder /app/.central-shared/shared/packages/auth-nest/dist /app/.central-shared/shared/packages/auth-nest/dist
COPY --from=builder /app/.central-shared/shared/packages/auth-nest/package.json /app/.central-shared/shared/packages/auth-nest/package.json
RUN mkdir -p node_modules/@osc \
 && ln -sfn /app/.central-shared/shared/packages/auth-core node_modules/@osc/auth-core \
 && ln -sfn /app/.central-shared/shared/packages/auth-nest node_modules/@osc/auth-nest \
 && mkdir -p /app/.central-shared/shared/packages/auth-core/node_modules \
 && ln -sfn /app/apps/api/node_modules/jose /app/.central-shared/shared/packages/auth-core/node_modules/jose \
 && mkdir -p /app/.central-shared/shared/packages/auth-nest/node_modules/@osc \
 && mkdir -p /app/.central-shared/shared/packages/auth-nest/node_modules/@nestjs \
 && ln -sfn /app/.central-shared/shared/packages/auth-core /app/.central-shared/shared/packages/auth-nest/node_modules/@osc/auth-core \
 && ln -sfn /app/apps/api/node_modules/@nestjs/common  /app/.central-shared/shared/packages/auth-nest/node_modules/@nestjs/common \
 && ln -sfn /app/apps/api/node_modules/@nestjs/core    /app/.central-shared/shared/packages/auth-nest/node_modules/@nestjs/core \
 && ln -sfn /app/apps/api/node_modules/reflect-metadata /app/.central-shared/shared/packages/auth-nest/node_modules/reflect-metadata \
 && ln -sfn /app/apps/api/node_modules/rxjs /app/.central-shared/shared/packages/auth-nest/node_modules/rxjs

EXPOSE 3001
CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main.js; else node dist/src/main.js; fi"]
