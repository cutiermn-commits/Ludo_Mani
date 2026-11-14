# Build from the repository root:  docker build -f server/Dockerfile -t ludo-server .
FROM node:22-alpine AS build
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY src/engine ./src/engine
COPY src/net/protocol.ts ./src/net/protocol.ts
COPY server ./server
RUN cd server && npm test && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/server/dist/index.js ./index.js
USER node
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1
CMD ["node", "index.js"]
