# 🏗️ Build Stage
FROM node:22-alpine AS builder

# Add security updates and required tools
# libc6-compat is needed for Prisma and some native Node modules
RUN apk update && apk upgrade && apk add --no-cache libc6-compat && rm -rf /var/cache/apk/*

WORKDIR /app

# Install pnpm
RUN npm i -g pnpm@latest

# Copy monorepo config files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all package.json files for workspace resolution
# This allows Docker to cache dependencies separately from source code
COPY packages/*/package.json ./packages/
COPY apps/ws/package.json ./apps/ws/

# Install dependencies with BuildKit cache mount for faster rebuilds
# The cache persists between builds, saving download time
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Now copy source code (changes here won't invalidate dependency cache)
COPY packages ./packages
COPY apps/ws ./apps/ws

# Generate Prisma client (if you're using Prisma)
RUN pnpm run generate:db

# Build with Turborepo using cache mount
# The --filter=ws... builds the ws app and all its dependencies
RUN --mount=type=cache,target=.turbo \
    pnpm dlx turbo build --filter=ws...

# Bundle everything into a single file with aggressive optimizations
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

# Optional: Compress the bundle with UPX (saves ~50-70% size)
# Remove these lines if you experience any runtime issues
RUN apk add --no-cache upx && \
    upx --best --lzma apps/ws/standalone.js || true

# 🚀 Production Stage - Ultra Minimal
FROM gcr.io/distroless/nodejs22-debian12:nonroot

# Set production environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    NODE_OPTIONS="--max-old-space-size=256"

WORKDIR /app

# Copy only the bundled file with correct permissions
# 65532:65532 is the UID:GID of nonroot user in distroless
COPY --from=builder --chown=65532:65532 /app/apps/ws/standalone.js ./

# Document the exposed port
EXPOSE 8080

# Use nonroot user for security
USER 65532:65532

# Handle graceful shutdown
STOPSIGNAL SIGTERM

# Run the bundled application
CMD ["standalone.js"]