FROM node:20-alpine AS base
WORKDIR /app

RUN npm install -g pnpm@9

# Create persistent data directory
RUN mkdir -p /app/data

# Copy workspace manifests and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy workspace packages needed
COPY lib/db ./lib/db
COPY artifacts/discord-bot ./artifacts/discord-bot

# Install ALL workspace dependencies (including root devDeps like tsx)
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install --no-frozen-lockfile

WORKDIR /app/artifacts/discord-bot

CMD ["pnpm", "run", "start"]
