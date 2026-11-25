FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY src ./src

FROM gcr.io/distroless/nodejs22-debian13:nonroot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=nonroot:nonroot /app /app
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["src/server.js"]
