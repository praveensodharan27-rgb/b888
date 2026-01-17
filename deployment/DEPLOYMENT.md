# AWS EC2 Deployment Guide for SellIt Application

This guide provides step-by-step instructions for deploying the SellIt (OLX-style) application on AWS EC2 with production-ready configuration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [EC2 Instance Setup](#ec2-instance-setup)
3. [Server Configuration](#server-configuration)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Nginx Configuration](#nginx-configuration)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Domain Configuration](#domain-configuration)
9. [PM2 Process Management](#pm2-process-management)
10. [Security Hardening](#security-hardening)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- AWS account with EC2 access
- Domain name (optional but recommended)
- GitHub repository with your code
- Basic knowledge of Linux commands
- SSH access to EC2 instance

---

## EC2 Instance Setup

### 1. Launch EC2 Instance

1. Log in to AWS Console
2. Navigate to EC2 → Launch Instance
3. Choose Ubuntu Server 22.04 LTS (or latest LTS)
4. Select instance type:
   - **Minimum**: t3.small (2 vCPU, 2 GB RAM) for small traffic
   - **Recommended**: t3.medium (2 vCPU, 4 GB RAM) for moderate traffic
   - **Production**: t3.large+ (4+ vCPU, 8+ GB RAM) for high traffic
5. Configure instance:
   - Create or select a key pair (save the .pem file securely)
   - Network settings: Allow SSH (port 22), HTTP (port 80), HTTPS (port 443)
   - Storage: Minimum 20 GB (SSD recommended)
6. Launch instance

### 2. Configure Security Groups

Create a security group with the following rules:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | Your IP | SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS traffic |
| Custom TCP | TCP | 5000 | 127.0.0.1/32 | Backend API (localhost only) |

**Security Best Practices:**
- Restrict SSH access to your IP only
- Only allow HTTP/HTTPS from anywhere
- Keep backend port (5000) accessible only from localhost

### 3. Connect to EC2 Instance

```bash
# On Windows (PowerShell)
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# On Mac/Linux
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

---

## Server Configuration

### 1. Run Initial Setup Script

```bash
# Upload setup script to server
scp -i your-key.pem deployment/ec2-setup.sh ubuntu@your-ec2-ip:~/

# SSH into server
ssh -i your-key.pem ubuntu@your-ec2-ip

# Make script executable and run
chmod +x ec2-setup.sh
./ec2-setup.sh
```

This script installs:
- Node.js 20.x
- PostgreSQL
- Nginx
- PM2
- Certbot (for SSL)
- Fail2ban (security)
- AWS CLI

### 2. Verify Installations

```bash
node -v    # Should show v20.x.x
npm -v     # Should show version
pm2 -v     # Should show version
psql --version  # Should show PostgreSQL version
nginx -v   # Should show Nginx version
```

---

## Database Setup

### 1. Run PostgreSQL Setup Script

```bash
# Upload script
scp -i your-key.pem deployment/postgresql-setup.sh ubuntu@your-ec2-ip:~/

# SSH and run
ssh -i your-key.pem ubuntu@your-ec2-ip
chmod +x postgresql-setup.sh
./postgresql-setup.sh
```

The script will:
- Create database and user
- Set up secure authentication
- Generate DATABASE_URL for your .env file

**Save the DATABASE_URL** - you'll need it for the .env file.

### 2. Manual Database Setup (Alternative)

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER sellit_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE sellit OWNER sellit_user;
GRANT ALL PRIVILEGES ON DATABASE sellit TO sellit_user;
\c sellit
GRANT ALL ON SCHEMA public TO sellit_user;
\q
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Navigate to application directory
cd /var/www/sellit

# Clone your repository
git clone https://github.com/yourusername/sellit.git .

# Or if using SSH:
git clone git@github.com:yourusername/sellit.git .
```

### 2. Set Up Environment Variables

```bash
cd /var/www/sellit/backend

# Copy template
cp ../deployment/env.template .env

# Edit .env file
nano .env
```

Fill in all required values, especially:
- `DATABASE_URL` (from PostgreSQL setup)
- `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- `SESSION_SECRET` (generate with: `openssl rand -base64 32`)
- `FRONTEND_URL` (your domain)
- `BACKEND_URL` (your API domain)

### 3. Install Dependencies and Run Migrations

```bash
cd /var/www/sellit/backend

# Install dependencies
npm install --production

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate deploy

# (Optional) Seed initial data
npm run seed-locations
npm run seed-all-categories
```

### 4. Set Up PM2

```bash
# Copy PM2 config
cp deployment/pm2.ecosystem.config.js /var/www/sellit/ecosystem.config.js

# Edit if needed (adjust instances, memory limits)
nano /var/www/sellit/ecosystem.config.js

# Start application
cd /var/www/sellit
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

### 5. Verify Application is Running

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs sellit-backend

# Test API endpoint
curl http://localhost:5000/api/health
```

---

## Nginx Configuration

### 1. Configure Nginx

```bash
# Copy Nginx config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/sellit

# Edit configuration (update domain name)
sudo nano /etc/nginx/sites-available/sellit

# Replace 'yourdomain.com' with your actual domain
# Update SSL certificate paths (will be set by Certbot later)

# Enable site
sudo ln -s /etc/nginx/sites-available/sellit /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 2. Verify Nginx is Working

```bash
# Check Nginx status
sudo systemctl status nginx

# Test from your local machine
curl http://your-ec2-ip/api/health
```

---

## SSL/HTTPS Setup

### 1. Obtain SSL Certificate with Let's Encrypt

```bash
# Install Certbot (already done in setup script)
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### 2. Auto-Renewal Setup

Certbot automatically sets up renewal, but verify:

```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

### 3. Update Nginx Config (if needed)

After Certbot runs, it updates your Nginx config. Verify:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Domain Configuration

### 1. DNS Configuration

In your domain registrar's DNS settings, add:

**For API subdomain (recommended):**
```
Type: A
Name: api (or @ for root domain)
Value: your-ec2-public-ip
TTL: 3600
```

**For main domain:**
```
Type: A
Name: @
Value: your-ec2-public-ip
TTL: 3600
```

**For www subdomain:**
```
Type: A
Name: www
Value: your-ec2-public-ip
TTL: 3600
```

### 2. Update Environment Variables

Update your `.env` file:

```bash
nano /var/www/sellit/backend/.env
```

Update:
- `FRONTEND_URL=https://yourdomain.com`
- `BACKEND_URL=https://api.yourdomain.com` (or `https://yourdomain.com`)

Restart application:
```bash
pm2 restart sellit-backend
```

---

## PM2 Process Management

### Useful PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs sellit-backend
pm2 logs sellit-backend --lines 100  # Last 100 lines

# Monitor resources
pm2 monit

# Restart application
pm2 restart sellit-backend

# Stop application
pm2 stop sellit-backend

# Delete from PM2
pm2 delete sellit-backend

# Reload (zero-downtime)
pm2 reload sellit-backend

# Save current process list
pm2 save
```

### PM2 Auto-Restart on Reboot

```bash
# Generate startup script
pm2 startup

# Follow the command shown (usually something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Save current process list
pm2 save
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Check firewall status
sudo ufw status

# Allow only necessary ports (already configured in setup script)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban Configuration

Fail2ban is already installed. Configure it:

```bash
# Edit SSH jail
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
```

Restart:
```bash
sudo systemctl restart fail2ban
```

### 3. Regular Security Updates

```bash
# Update package list
sudo apt-get update

# Upgrade packages
sudo apt-get upgrade -y

# Set up automatic security updates
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. Database Security

- PostgreSQL is configured to accept connections only from localhost
- Use strong passwords
- Regularly update PostgreSQL
- Consider enabling SSL for database connections in production

### 5. Application Security

- Use strong JWT secrets (32+ characters)
- Enable HTTPS only
- Set secure cookie flags
- Regularly update dependencies: `npm audit fix`

---

## Monitoring & Maintenance

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop  # Install with: sudo apt-get install htop

# Disk usage
df -h

# Check logs
tail -f /var/log/sellit/backend-combined.log
tail -f /var/log/nginx/sellit-access.log
```

### 2. Database Maintenance

```bash
# Connect to database
sudo -u postgres psql -d sellit

# Check database size
\l+

# Vacuum database (regular maintenance)
VACUUM ANALYZE;

# Check connections
SELECT count(*) FROM pg_stat_activity;
```

### 3. Backup Strategy

**Database Backup:**
```bash
# Create backup script
nano /home/ubuntu/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U sellit_user -d sellit > $BACKUP_DIR/sellit_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "sellit_*.sql" -mtime +7 -delete
```

```bash
chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

**Application Files Backup:**
```bash
# Backup .env and uploads
tar -czf /home/ubuntu/backups/app_$(date +%Y%m%d).tar.gz \
  /var/www/sellit/backend/.env \
  /var/www/sellit/backend/uploads
```

### 4. Log Rotation

PM2 handles log rotation, but you can configure it:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs sellit-backend --err

# Check if port is in use
sudo netstat -tulpn | grep 5000

# Check environment variables
cd /var/www/sellit/backend
cat .env | grep -v "^#" | grep -v "^$"
```

### Database Connection Issues

```bash
# Test database connection
psql -U sellit_user -d sellit -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/sellit-error.log

# Check access logs
sudo tail -f /var/log/nginx/sellit-access.log
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
```

### High Memory Usage

```bash
# Check memory usage
free -h
pm2 monit

# Restart application
pm2 restart sellit-backend

# Adjust PM2 memory limit in ecosystem.config.js
```

### 502 Bad Gateway

- Check if backend is running: `pm2 status`
- Check backend logs: `pm2 logs sellit-backend`
- Verify Nginx upstream configuration
- Check firewall rules

---

## Quick Reference

### Deployment Workflow

```bash
# 1. Pull latest code
cd /var/www/sellit
git pull origin main

# 2. Install dependencies
cd backend
npm install --production

# 3. Run migrations
npm run prisma:generate
npm run prisma:migrate deploy

# 4. Restart application
cd ..
pm2 reload ecosystem.config.js

# 5. Check status
pm2 status
pm2 logs sellit-backend --lines 50
```

### Important File Locations

- Application: `/var/www/sellit`
- Environment: `/var/www/sellit/backend/.env`
- Logs: `/var/log/sellit/`
- Nginx config: `/etc/nginx/sites-available/sellit`
- SSL certificates: `/etc/letsencrypt/live/yourdomain.com/`
- PM2 config: `/var/www/sellit/ecosystem.config.js`

### Useful Commands

```bash
# View all running processes
pm2 list

# Monitor in real-time
pm2 monit

# Restart everything
pm2 restart all

# View system resources
htop

# Check disk space
df -h

# Check network connections
sudo netstat -tulpn
```

---

## Support

For issues or questions:
1. Check application logs: `pm2 logs sellit-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/sellit-error.log`
3. Check system logs: `sudo journalctl -xe`
4. Review this documentation

---

**Last Updated:** 2024
**Version:** 1.0
