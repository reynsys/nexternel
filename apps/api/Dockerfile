# Nexternel API — Phase 1 foundation (build from repo root)

FROM node:22-alpine AS builder

WORKDIR /app



COPY packages/domain ./packages/domain

COPY packages/plugin-sdk ./packages/plugin-sdk

COPY apps/api ./apps/api



WORKDIR /app/packages/domain

RUN npm install && npm run build



WORKDIR /app/packages/plugin-sdk

RUN npm install && npm run build



WORKDIR /app/apps/api

RUN npm install && npm run build



FROM node:22-alpine AS runner

# Reuse the Influx CLI from the same image family as the stack (see docker-compose influxdb service)
COPY --from=influxdb:2.7-alpine /usr/local/bin/influx /usr/local/bin/influx
COPY --from=eclipse-mosquitto:2 /usr/bin/mosquitto_passwd /usr/local/bin/mosquitto_passwd
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker

WORKDIR /app

ENV NODE_ENV=production

ENV PORT=4000

ENV HOST=0.0.0.0



COPY --from=builder /app/packages/domain ./packages/domain

COPY --from=builder /app/packages/plugin-sdk ./packages/plugin-sdk

COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Bundled Node-RED template (compose may also mount ./nodered over this path)
COPY nodered /nodered-template



WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/index.js"]

