# Boomer & Kev Studio — produção na VPS (chamado pelo n8n via rede Docker)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx next build

FROM node:22-alpine
# ffmpeg/ffprobe: montagem final dos clipes (pipeline/run e tools/assemble.mjs)
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/tools ./tools
RUN mkdir -p .tmp
EXPOSE 3000
CMD ["node", "server.js"]
