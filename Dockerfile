FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY web/package.json ./web/
COPY backend/package.json ./backend/
COPY realtime/package.json ./realtime/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Build web
COPY web ./web
COPY packages ./packages
RUN cd web && pnpm build

# Production image
FROM node:20-alpine AS production
RUN corepack enable pnpm
WORKDIR /app

COPY --from=base /app/web/.next ./web/.next
COPY --from=base /app/web/public ./web/public
COPY --from=base /app/web/package.json ./web/
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/web/node_modules ./web/node_modules
COPY --from=base /app/package.json ./

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "web/dist/server.js"]
