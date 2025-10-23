# ========= Etapa de dependencias =========
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

# ========= Imagen final =========
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Copia sólo node_modules primero (cachea mejor)
COPY --from=deps /app/node_modules ./node_modules
# Copia el resto del código
COPY . .

EXPOSE 3001
CMD ["npm", "start"]
