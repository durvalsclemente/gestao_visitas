# syntax=docker/dockerfile:1.6
# Build: contexto = raiz do repo (pega apps/web).

FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# Workspace + submodule + app — pnpm resolve @osc/ui-master via workspace:*
COPY pnpm-workspace.yaml package.json ./
COPY .central-shared ./.central-shared
COPY apps/web/package.json ./apps/web/
RUN pnpm install --no-frozen-lockfile --shamefully-hoist

# Compila auth-core/auth-nest dist (main aponta lá)
RUN pnpm add -w --save-dev typescript@5.6.2 @types/node@20 \
 && for d in /app/.central-shared/shared/packages/auth-core /app/.central-shared/shared/packages/auth-nest; do \
      sed -i '/"ignoreDeprecations"/d' "$d/tsconfig.build.json" 2>/dev/null || true; \
      cd "$d" && /app/node_modules/.bin/tsc -p tsconfig.build.json; \
    done

WORKDIR /app/apps/web
COPY apps/web ./

ARG VITE_API_BASE_URL=https://api.visitas.osc.app.br/api
ARG VITE_CENTRAL_URL=https://api.auth.osc.app.br
ARG VITE_CENTRAL_WEB_URL=https://auth.osc.app.br
ARG VITE_CLIENT_ID=gestao-visitas
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CENTRAL_URL=$VITE_CENTRAL_URL
ENV VITE_CENTRAL_WEB_URL=$VITE_CENTRAL_WEB_URL
ENV VITE_CLIENT_ID=$VITE_CLIENT_ID

# Vite-only (pula tsc -b por drift de tipos pre-existente — ver CLAUDE.md)
RUN pnpm exec vite build

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
  listen 80 default_server;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
  location ~* \.(js|css|woff2?|ttf|eot|png|jpg|svg|ico)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
  }
}
EOF
EXPOSE 80
