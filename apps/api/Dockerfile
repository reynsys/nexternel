# Nexternel API — Phase 1 foundation (build from repo root)
FROM node:22-alpine AS builder
WORKDIR /app

COPY packages/domain ./packages/domain
COPY apps/api ./apps/api

WORKDIR /app/packages/domain
RUN npm install && npm run build

WORKDIR /app/apps/api
RUN npm install && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY --from=builder /app/packages/domain ./packages/domain
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
