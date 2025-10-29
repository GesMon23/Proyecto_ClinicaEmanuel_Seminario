# --- build de frontend ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
# si usas peer deps relajadas:
ENV npm_config_legacy_peer_deps=true
RUN npm ci --no-audit --no-fund

COPY . .
# Para React/Vite/CRA el output suele ser ./build
# (si tu script genera ./dist, cambia la línea de COPY más abajo a /app/dist)
RUN npm run build

# --- nginx para servir estáticos + proxy /api ---
FROM nginx:alpine
# quita default
RUN rm -f /etc/nginx/conf.d/default.conf
# tu config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# OJO: copiamos ./build (no dist)
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx","-g","daemon off;"]
