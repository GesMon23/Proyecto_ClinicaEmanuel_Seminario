# ====== Build del frontend ======
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependencias (incluye devDependencies para poder ejecutar "vite build")
COPY package*.json ./
# Si usas npm >=9: --include=dev; si no, npm instalará dev por defecto si no pones NODE_ENV=production
RUN npm ci --include=dev --no-audit --no-fund || npm ci --no-audit --no-fund

# Copiar el código y compilar
COPY . .
RUN npm run build

# ====== Nginx para servir el build ======
FROM nginx:alpine

# Reemplazar la config por la tuya
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
