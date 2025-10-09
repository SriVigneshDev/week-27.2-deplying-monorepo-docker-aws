# 🏗️ Build Stage
FROM node:22-alpine AS builder

RUN apk update && apk upgrade && apk add --no-cache libc6-compat && rm -rf /var/cache/apk/*

WORKDIR /app

RUN npm i -g pnpm@latest

# Copy package files for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/*/package.json ./packages/
COPY apps/ws/package.json ./apps/ws/

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/ws ./apps/ws

# Generate database client
RUN pnpm run generate:db

# Build and bundle (now includes esbuild via build:prod script!)
RUN --mount=type=cache,target=.turbo \
    pnpm --filter=ws run build:prod
    # This runs: tsc -b && node esbuild.config.mjs

# 🚀 Production Stage - Alpine Minimal (~15-20MB total)
FROM alpine:3.20

# Install only Node.js runtime
RUN apk add --no-cache nodejs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy ONLY the bundled file (this is why it's still 15-20MB!)
COPY --from=builder --chown=nodejs:nodejs /app/apps/ws/standalone.js ./

ENV NODE_ENV=production \
    PORT=8080 \
    NODE_OPTIONS="--max-old-space-size=256"

# Health check for WebSocket
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const net = require('net'); const socket = net.connect(8080, 'localhost'); socket.on('connect', () => { socket.end(); process.exit(0); }); socket.on('error', () => process.exit(1));"

USER nodejs

EXPOSE 8080

CMD ["node", "standalone.js"]