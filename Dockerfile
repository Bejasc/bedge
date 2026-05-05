FROM node:20-alpine
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bot/package.json ./apps/bot/
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY packages/logger/package.json ./packages/logger/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm -r build

ENV NODE_ENV=production
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
