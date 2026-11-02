FROM node:24-bookworm-slim AS compilacion
# npm ejecuta node-gyp al instalar better-sqlite3 aunque el paquete ya traiga binarios.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN npm run build:arranque

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATOS_DIR=/datos
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=compilacion /app/.next/standalone ./
COPY --from=compilacion /app/.next/static ./.next/static
COPY --from=compilacion /app/arranque ./
COPY --from=compilacion /app/src/db/migraciones ./src/db/migraciones

RUN mkdir -p /datos && chown -R node:node /datos /app/.next
USER node
VOLUME /datos
EXPOSE 3000

CMD ["node", "iniciar.cjs"]
