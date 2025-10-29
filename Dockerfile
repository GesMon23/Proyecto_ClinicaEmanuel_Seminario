FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
ENV npm_config_legacy_peer_deps=true
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx","-g","daemon off;"]
