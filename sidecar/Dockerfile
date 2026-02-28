# ============================================
# GENESIS SIDECAR AGENT - DOCKERFILE
# ============================================
# Multi-stage build for lightweight production image

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (dev + prod) for the build
RUN npm ci

# Copy source code
COPY *.ts ./
COPY tsconfig.json ./

# Build TypeScript → dist/
RUN npm run build

# Prune dev dependencies so we only carry production deps forward
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl docker-cli

# Copy built files and production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create non-root user with docker-socket access
# GID 999 is conventionally used for the docker group on the host;
# we create a matching group so the mounted /var/run/docker.sock is writable.
RUN addgroup -g 1001 -S sidecar && \
    adduser -u 1001 -S sidecar -G sidecar && \
    addgroup -g 999 -S docker 2>/dev/null || true && \
    addgroup sidecar docker 2>/dev/null || true

USER sidecar

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1

# Start agent
CMD ["node", "dist/sidecar-agent.js"]
