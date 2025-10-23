# ========= Build del frontend =========
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ========= Nginx para servir el build =========
FROM nginx:alpine
# Copiamos el build
COPY --from=build /app/dist /usr/share/nginx/html
# Config Nginx (SPA + proxy opcional a /api)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
