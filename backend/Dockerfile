# Production image for the OrderFlow API
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies (layer is cached while package files don't change)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY database ./database
COPY scripts ./scripts

# Run as the non-root user that ships with the official Node image
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "src/server.js"]
