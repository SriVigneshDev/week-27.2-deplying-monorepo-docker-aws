# 🏗️ Build Stage
FROM node:22-alpine AS builder

RUN apk update && apk upgrade && apk add --no-cache libc6-compat && rm -rf /var/cache/apk/*

WORKDIR /app

RUN npm i -g pnpm@latest

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/*/package.json ./packages/
COPY apps/ws/package.json ./apps/ws/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/ws ./apps/ws

RUN pnpm run generate:db

RUN --mount=type=cache,target=.turbo \
    pnpm dlx turbo build --filter=ws...

# Bundle with esbuild (remove UPX - it doesn't work on JS files)
RUN npx esbuild@latest apps/ws/dist/index.js \
    --bundle \
    --platform=node \
    --target=node22 \
    --outfile=apps/ws/standalone.js \
    --minify \
    --tree-shaking=true \
    --drop:console \
    --drop:debugger \
    --keep-names=false \
    --legal-comments=none \
    --define:process.env.NODE_ENV=\"production\"

# 🚀 Production Stage - Alpine Minimal (~15-20MB total)
FROM alpine:3.20

# Install only Node.js runtime
RUN apk add --no-cache nodejs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy bundled file
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