# syntax=docker/dockerfile:1
# ---- Builder Stage ----
FROM node:20-alpine AS builder

# Prisma needs OpenSSL; bcrypt needs python3+make+g++ for native compilation
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client (needs schema + binaryTargets)
RUN npx prisma generate

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine

# Prisma needs OpenSSL at runtime
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Hugging Face Spaces requires port 7860
ENV BACKEND_PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "dist/index.js"]
