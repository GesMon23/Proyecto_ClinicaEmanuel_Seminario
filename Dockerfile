# ---------- FASE 1: BUILD ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
ENV npm_config_legacy_peer_deps=true
RUN npm ci --no-audit --no-fund

COPY . .

# Normaliza artefactos a /_out (valen build/ o dist/)
RUN set -eux; \
    npm run build; \
    mkdir -p /_out; \
    if [ -d ./build ]; then cp -a ./build/. /_out/; \
    elif [ -d ./dist ]; then cp -a ./dist/. /_out/; \
    else echo "No existe build/ ni dist/"; ls -la; exit 1; fi; \
    ls -la /_out

# ---------- FASE 2: NGINX ----------
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /_out /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx","-g","daemon off;"]
