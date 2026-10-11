# ---------- FASE 1: BUILD ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
ENV npm_config_legacy_peer_deps=true
RUN npm ci --no-audit --no-fund

COPY . .

# Vite deja el resultado en dist/
RUN npm run build

# ---------- FASE 2: NGINX ----------
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx","-g","daemon off;"]
