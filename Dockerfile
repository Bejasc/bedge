FROM node:20-alpine
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bot/package.json ./apps/bot/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter bot build

ENV NODE_ENV=production
CMD ["node", "apps/bot/dist/index.js"]
