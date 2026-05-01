# syntax=docker/dockerfile:1.6
# Build: contexto = raiz do repo (pega apps/web).

FROM node:20-slim AS builder
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install --no-audit --no-fund

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
RUN npx vite build

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
