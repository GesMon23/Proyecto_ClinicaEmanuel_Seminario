# ====== Build del frontend ======
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production

# Instalar dependencias (modo estricto relajado por conflicto de peer deps)
COPY package*.json ./
ENV npm_config_legacy_peer_deps=true
RUN npm ci --no-audit --no-fund

# Copiar código y compilar
COPY . .
RUN npm run build

# ====== Nginx para servir el build ======
FROM nginx:alpine

# Usar tu config de Nginx (SPA + proxy /api si lo definiste ahí)
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
