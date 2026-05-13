FROM node:20-alpine AS base
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY lib/db ./lib/db
COPY artifacts/discord-bot ./artifacts/discord-bot

RUN pnpm install --frozen-lockfile --filter "@workspace/discord-bot..." 2>/dev/null || \
    pnpm install --no-frozen-lockfile --filter "@workspace/discord-bot..."

CMD ["pnpm", "--filter", "@workspace/discord-bot", "run", "start"]
