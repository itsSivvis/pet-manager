# syntax=docker/dockerfile:1
# Single production image: the Express server also serves the built client.

# Override to use a registry mirror, e.g. --build-arg NODE_IMAGE=mirror.gcr.io/library/node:22-alpine
ARG NODE_IMAGE=node:22-alpine

# ---- build the client --------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --no-audit --no-fund
COPY client client
RUN npm run build --workspace client

# ---- production dependencies of the server only -------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --omit=dev --workspace server --include-workspace-root=false --no-audit --no-fund

# ---- runtime -------------------------------------------------------------------
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/client/dist \
    UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node server/package.json server/
COPY --chown=node:node server/src server/src
COPY --from=build --chown=node:node /app/client/dist client/dist
RUN mkdir -p /data/uploads && chown -R node:node /data
# Never run as root.
USER node
VOLUME ["/data/uploads"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/src/index.js"]

LABEL org.opencontainers.image.title="Pet Manager" \
      org.opencontainers.image.description="Self-hosted pet care manager" \
      org.opencontainers.image.licenses="MIT"
