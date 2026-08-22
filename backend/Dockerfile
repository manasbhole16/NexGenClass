# ============================================================
# NEXGENCLASS BACKEND DOCKERFILE
# ============================================================

FROM node:18-alpine

WORKDIR /app

# Install dependencies first for optimal caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Expose API and WebSocket Port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start Express + Socket.IO Server
CMD ["node", "app.js"]
