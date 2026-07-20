# La Caverne aux 40 Voleurs — backend image (Alibaba Cloud deploy ready)
# Long-running Node HTTP server with SSE + file persistence.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund
COPY server ./server
COPY scripts ./scripts
COPY docs ./docs
ENV PORT=8787
ENV NODE_ENV=production
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8787/api/health >/dev/null 2>&1 || exit 1
CMD ["node", "server/server.mjs"]
