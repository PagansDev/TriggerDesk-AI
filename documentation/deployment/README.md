# Deployment

Guia de deploy e configuração de produção.

## Environment Setup

### Production Variables

```env
NODE_ENV=production
PORT=3037
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=lnbot_livechat
DB_USER=your-db-user
DB_PASSWORD=your-db-password
OPENROUTER_API_KEY=your-api-key
OPENROUTER_MODEL=openai/gpt-3.5-turbo
```

### Security

- Use HTTPS em produção
- Configure CORS adequadamente
- Implemente rate limiting
- Use variáveis de ambiente seguras

## Build Process

### Compilation

```bash
npm run build
```

### Output

- Código compilado em `dist/`
- Source maps para debugging
- TypeScript declarations

## Database Setup

### Production Database

```sql
CREATE DATABASE lnbot_livechat_prod;
CREATE USER 'lnbot_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON lnbot_livechat_prod.* TO 'lnbot_user'@'%';
FLUSH PRIVILEGES;
```

### Migrations

```bash
NODE_ENV=production npx sequelize-cli db:migrate
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3037
CMD ["node", "dist/app.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3037:3037'
    environment:
      - NODE_ENV=production
      - DB_HOST=db
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: lnbot_livechat
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

## Process Management

### PM2

```bash
npm install -g pm2
pm2 start dist/app.js --name lnbot-livechat
pm2 save
pm2 startup
```

### PM2 Configuration

```json
{
  "apps": [
    {
      "name": "lnbot-livechat",
      "script": "dist/app.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production"
      }
    }
  ]
}
```

## Load Balancing

### Nginx Configuration

```nginx
upstream lnbot_backend {
    server 127.0.0.1:3037;
    server 127.0.0.1:3038;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://lnbot_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Health Checks

```bash
curl http://localhost:3037/api/health
```

### Logs

```bash
# PM2 logs
pm2 logs lnbot-livechat

# Docker logs
docker logs container_name
```

### Metrics

- CPU usage
- Memory consumption
- Database connections
- Response times

## SSL/TLS

### Let's Encrypt

```bash
certbot --nginx -d your-domain.com
```

### Nginx SSL Config

```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
}
```

## Backup Strategy

### Database Backup

```bash
# Daily backup
mysqldump -u root -p lnbot_livechat > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p lnbot_livechat > /backups/lnbot_$DATE.sql
find /backups -name "lnbot_*.sql" -mtime +7 -delete
```

### Application Backup

- Source code versioning
- Environment configuration
- SSL certificates
- Database dumps

## Scaling

### Horizontal Scaling

- Multiple app instances
- Load balancer
- Database read replicas
- Redis for session storage

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Implement caching
- Monitor performance

## Troubleshooting

### Common Issues

- Port already in use
- Database connection failed
- SSL certificate expired
- Memory leaks

### Debug Commands

```bash
# Check port usage
netstat -tulpn | grep :3037

# Check database connection
mysql -h host -u user -p

# Check logs
tail -f /var/log/nginx/error.log
```

## Rollback Strategy

### Application Rollback

```bash
# PM2 rollback
pm2 reload lnbot-livechat

# Docker rollback
docker-compose down
docker-compose up -d --scale app=1
```

### Database Rollback

```bash
# Restore from backup
mysql -u root -p lnbot_livechat < backup_file.sql
```
