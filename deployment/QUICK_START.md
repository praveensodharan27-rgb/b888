# Quick Start Deployment Guide

This is a condensed version of the deployment process. For detailed instructions, see `DEPLOYMENT.md`.

## Prerequisites Checklist

- [ ] AWS EC2 instance launched (Ubuntu 22.04 LTS)
- [ ] Security group configured (SSH, HTTP, HTTPS)
- [ ] Domain name ready (optional)
- [ ] GitHub repository URL
- [ ] SSH key pair (.pem file)

## 5-Minute Setup

### Step 1: Connect to Server

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Step 2: Run Initial Setup

```bash
# Upload and run setup script
scp -i your-key.pem deployment/ec2-setup.sh ubuntu@your-ec2-ip:~/
ssh -i your-key.pem ubuntu@your-ec2-ip
chmod +x ec2-setup.sh
./ec2-setup.sh
```

**Wait 5-10 minutes** for installation to complete.

### Step 3: Set Up Database

```bash
# On server
chmod +x postgresql-setup.sh
./postgresql-setup.sh
# Follow prompts, save DATABASE_URL
```

### Step 4: Clone and Configure App

```bash
# Clone repository
cd /var/www/sellit
git clone https://github.com/yourusername/sellit.git .

# Set up environment
cp deployment/env.template backend/.env
nano backend/.env
# Fill in: DATABASE_URL, JWT_SECRET, FRONTEND_URL, etc.

# Install and migrate
cd backend
npm install --production
npm run prisma:generate
npm run prisma:migrate deploy
```

### Step 5: Start Application

```bash
cd /var/www/sellit
cp deployment/pm2.ecosystem.config.js ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions shown
```

### Step 6: Configure Nginx

```bash
# Copy and edit config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/sellit
sudo nano /etc/nginx/sites-available/sellit
# Replace 'yourdomain.com' with your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/sellit /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Set Up SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts, choose redirect HTTP to HTTPS
```

### Step 8: Configure Domain DNS

In your domain registrar, add A record:
```
Type: A
Name: @ (or api)
Value: your-ec2-public-ip
TTL: 3600
```

### Step 9: Update Environment and Restart

```bash
# Update .env with domain
nano /var/www/sellit/backend/.env
# Set FRONTEND_URL=https://yourdomain.com
# Set BACKEND_URL=https://yourdomain.com (or api.yourdomain.com)

# Restart app
pm2 restart sellit-backend
```

## Verify Deployment

```bash
# Check app status
pm2 status
pm2 logs sellit-backend --lines 20

# Test API
curl https://yourdomain.com/api/health

# Check Nginx
sudo systemctl status nginx
```

## Common Commands

```bash
# View logs
pm2 logs sellit-backend

# Restart app
pm2 restart sellit-backend

# Deploy updates
cd /var/www/sellit
git pull
cd backend
npm install --production
npm run prisma:migrate deploy
cd ..
pm2 reload ecosystem.config.js
```

## Troubleshooting

**App won't start:**
```bash
pm2 logs sellit-backend --err
cat /var/www/sellit/backend/.env | grep DATABASE_URL
```

**502 Bad Gateway:**
```bash
pm2 status
sudo systemctl status nginx
sudo tail -f /var/log/nginx/sellit-error.log
```

**SSL issues:**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## Next Steps

- Set up automated backups
- Configure monitoring
- Set up CI/CD pipeline
- Review security settings

For detailed information, see `DEPLOYMENT.md`.
