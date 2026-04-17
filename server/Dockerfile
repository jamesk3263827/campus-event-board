FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN apk add --no-cache curl
EXPOSE 3000
CMD ["node", "index.js"]