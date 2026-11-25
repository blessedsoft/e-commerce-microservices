FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY src ./src

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/server.js"]
