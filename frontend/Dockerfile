FROM node:24.22.1-trixie-slim

WORKDIR /app

RUN npm install --global --no-audit --no-fund pnpm@12.15.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5174
CMD ["pnpm", "dev", "--host", "127.0.0.1", "--port", "5174", "--strictPort"]