# ── Node.js API Server ────────────────────────────────────────────────────────
# Uses Node 20 on Alpine Linux — small image, fast cold starts.
FROM node:20-alpine
WORKDIR /app

# Copy package files first so npm ci is cached unless dependencies change
COPY package*.json ./

# npm ci installs exact versions from package-lock.json and skips devDependencies
RUN npm ci --omit=dev

# Copy the rest of the server source
COPY . .

# Install curl for the docker-compose healthcheck
RUN apk add --no-cache curl

EXPOSE 3000

CMD ["node", "index.js"]
