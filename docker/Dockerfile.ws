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

# Build and bundle
RUN --mount=type=cache,target=.turbo \
    pnpm --filter=ws run build:prod

# =========================================================================
# ✨ NEW: Create a clean, deployable output with no symlinks
# =========================================================================
RUN pnpm --filter ws deploy --prod /app/deploy
# Copy the built standalone file into the deploy directory
RUN cp /app/apps/ws/standalone.js /app/deploy/


# 🚀 Production Stage - Alpine Minimal (~15-20MB total)
FROM alpine:3.20

# Install only Node.js runtime and create a non-root user
RUN apk add --no-cache nodejs openssl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# =========================================================================
# ✨ UPDATED: Copy from the clean /deploy directory
# This is now much simpler and more reliable.
# =========================================================================
COPY --from=builder --chown=nodejs:nodejs /app/deploy .

ENV NODE_ENV=production \
    PORT=8081 \
    NODE_OPTIONS="--max-old-space-size=256"

USER nodejs

EXPOSE 8081

# The CMD needs to be an array for proper signal handling
CMD ["node", "standalone.js"]