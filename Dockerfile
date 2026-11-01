# Multi-stage Dockerfile for Spielfranzen
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci

# Copy full source
COPY . .

# Generate Prisma Client & Build all workspaces
RUN npx prisma generate --schema=backend/prisma/schema.prisma
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --schema=backend/prisma/schema.prisma && node backend/dist/index.js"]
