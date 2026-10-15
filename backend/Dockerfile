# ========= Etapa de dependencias =========
FROM node:24-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

# ========= Imagen final =========
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Copia sólo node_modules primero (cachea mejor)
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# fotos/ y tmp/ se montan como volúmenes; crearlas aquí con dueño `node` hace que el volumen
# nuevo herede ese dueño y el proceso (sin root) pueda escribir
RUN mkdir -p fotos tmp && chown node:node fotos tmp
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

# Aplica las migraciones pendientes y arranca; si una migración falla el contenedor no levanta
CMD ["sh", "-c", "node db/migrar.js && exec node server.js"]
