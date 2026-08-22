# NexGenClass 2.0 — Production Deployment Guide

This guide outlines deployment options for NexGenClass across Linux servers, Docker containers, and Cloud platforms.

---

## 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: MongoDB Atlas cluster or self-hosted MongoDB 6.0+
- **Domain & SSL**: Valid domain with HTTPS certificate (Let's Encrypt / Cloudflare)

---

## 2. Docker Compose Deployment (Recommended)

The easiest method to deploy the entire stack (Database, Backend API, and Web Client):

```bash
# 1. Clone the repository
git clone https://github.com/manasbhole16/NexGenClass.git
cd NexGenClass

# 2. Configure Environment Variables
cp .env.example .env
# Edit .env with your production MONGO_URI, JWT_SECRET, and domain names

# 3. Launch with Docker Compose
docker compose up -d --build

# 4. Verify Containers
docker compose ps
curl http://localhost:3000/api/health
```

---

## 3. Standalone Linux / Node.js Deployment (PM2 + Nginx)

### A. Backend Deployment
```bash
cd backend
npm install --omit=dev
cp ../.env.example .env
# Configure production variables in .env

# Start with PM2 process manager
npm install -g pm2
pm2 start app.js --name "nexgen-backend"
pm2 save
pm2 startup
```

### B. Frontend Deployment
```bash
cd ../frontend
npm install
npm run build

# Output will be located in frontend/dist
```

### C. Nginx Reverse Proxy Configuration (`/etc/nginx/sites-available/nexgenclass`)
```nginx
server {
    listen 80;
    server_name classroom.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name classroom.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/classroom.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/classroom.yourdomain.com/privkey.pem;

    # Frontend Static Files
    location / {
        root /var/www/nexgenclass/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Real-time WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 4. Mobile Client Deployment (React Native / Expo)

### A. Android APK / App Bundle
```bash
cd mobile
npm install
# Set API_BASE_URL to your production HTTPS domain in src/constants/config.ts

# Build Android release APK
npx eas-cli build --platform android --profile preview
```

### B. iOS IPA Build
```bash
cd mobile
# Ensure Apple Developer Program credentials are configured
npx eas-cli build --platform ios --profile production
```

---

## 5. Database Backup & Disaster Recovery

### Automated Nightly Backup Script (`backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/nexgenclass"
DATE=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

mongodump --uri="$MONGO_URI" --archive="$BACKUP_DIR/backup_$DATE.gz" --gzip
# Retain backups for 14 days
find "$BACKUP_DIR" -type f -mtime +14 -name "*.gz" -exec rm {} \;
```

### Database Restore Procedure
```bash
mongorestore --uri="$MONGO_URI" --archive="/var/backups/nexgenclass/backup_YYYYMMDD_HHMMSS.gz" --gzip --drop
```
