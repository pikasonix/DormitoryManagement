FROM node:18-alpine

# Install OpenSSL 3.0 and other dependencies
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat

WORKDIR /app

# Set Prisma environment variables
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
ENV OPENSSL_CONF=/dev/null

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client with correct binary target
RUN npx prisma generate --generator client

# Copy source code
COPY . .

# Build application (if you have build script)
RUN npm run build

EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5002/health || exit 1

CMD ["npm", "start"]