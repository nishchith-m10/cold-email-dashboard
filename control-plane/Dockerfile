# PHASE 73: Control Plane Dockerfile
# Multi-stage build for Genesis Control Plane service.
# Follows 12-Factor App Principle 6: Processes (stateless, disposable).
#
# Usage:
#   docker build -t genesis-control-plane ./control-plane
#   docker run -p 3000:3000 --env-file .env genesis-control-plane
#
# @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.4

# ============================================
# STAGE 1: BUILD
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for layer caching
COPY control-plane/package.json control-plane/package-lock.json* ./control-plane/
COPY packages/ ./packages/

WORKDIR /app/control-plane

# Install dependencies (production + dev for build)
RUN npm ci

# Copy source
COPY control-plane/tsconfig.json ./
COPY control-plane/src/ ./src/

# Build TypeScript
RUN npm run build

# ============================================
# STAGE 2: PRODUCTION
# ============================================
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S genesis && \
    adduser -S genesis -u 1001 -G genesis

WORKDIR /app

# Copy package manifest and install production-only deps
COPY control-plane/package.json control-plane/package-lock.json* ./control-plane/
COPY packages/ ./packages/

WORKDIR /app/control-plane

RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy compiled output
COPY --from=builder /app/control-plane/dist ./dist

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV LOG_LEVEL=info

# Health check (spec 69.9.2 Principle 5)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Expose health check port
EXPOSE 3000

# Run as non-root
USER genesis

# Start the control plane
CMD ["node", "dist/index.js"]
