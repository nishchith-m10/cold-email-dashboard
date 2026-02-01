# ============================================
# GENESIS SIDECAR AGENT - DOCKERFILE
# ============================================
# Multi-stage build for lightweight production image

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY *.ts ./
COPY tsconfig.json ./

# Install dev dependencies and build
RUN npm install typescript ts-node @types/node @types/express @types/uuid
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl docker-cli

# Copy built files and production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S sidecar && \
    adduser -u 1001 -S sidecar -G sidecar

# Give sidecar user access to docker socket (mounted at runtime)
RUN addgroup -g 999 docker && \
    adduser sidecar docker

USER sidecar

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1

# Start agent
CMD ["node", "dist/sidecar-agent.js"]
