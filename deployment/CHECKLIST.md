# Pre-Deployment Checklist

Use this checklist to ensure you have everything ready before deploying.

## Pre-Deployment Requirements

### AWS Setup
- [ ] AWS account created and active
- [ ] EC2 instance launched (Ubuntu 22.04 LTS recommended)
- [ ] Security group configured:
  - [ ] SSH (port 22) - restricted to your IP
  - [ ] HTTP (port 80) - open to 0.0.0.0/0
  - [ ] HTTPS (port 443) - open to 0.0.0.0/0
- [ ] Key pair (.pem file) downloaded and secured
- [ ] EC2 public IP address noted

### Domain & DNS
- [ ] Domain name purchased
- [ ] DNS access configured
- [ ] Know how to add A records

### Application
- [ ] Code pushed to GitHub repository
- [ ] Repository is accessible (public or SSH key added)
- [ ] All environment variables identified
- [ ] Database schema is ready (Prisma migrations)

### Credentials & Keys
- [ ] Database password ready (strong password)
- [ ] JWT secret generated (`openssl rand -base64 32`)
- [ ] Session secret generated (`openssl rand -base64 32`)
- [ ] SMTP credentials (if using email)
- [ ] AWS S3 credentials (if using S3 for uploads)
- [ ] Razorpay keys (if using payments)
- [ ] OAuth credentials (Google/Facebook, if using)

## Deployment Steps Checklist

### Phase 1: Server Setup
- [ ] Connected to EC2 via SSH
- [ ] Uploaded `ec2-setup.sh` to server
- [ ] Ran `ec2-setup.sh` successfully
- [ ] Verified Node.js, PostgreSQL, Nginx, PM2 installed
- [ ] Firewall (UFW) configured

### Phase 2: Database Setup
- [ ] Uploaded `postgresql-setup.sh` to server
- [ ] Ran `postgresql-setup.sh` successfully
- [ ] Database and user created
- [ ] DATABASE_URL saved securely
- [ ] Tested database connection

### Phase 3: Application Deployment
- [ ] Cloned repository to `/var/www/sellit`
- [ ] Copied `env.template` to `backend/.env`
- [ ] Filled in all environment variables in `.env`
- [ ] Installed npm dependencies
- [ ] Generated Prisma Client
- [ ] Ran database migrations
- [ ] (Optional) Seeded initial data

### Phase 4: Process Management
- [ ] Copied `pm2.ecosystem.config.js` to project root
- [ ] (Optional) Adjusted PM2 config for your needs
- [ ] Started application with PM2
- [ ] Verified app is running (`pm2 status`)
- [ ] Set up PM2 startup script
- [ ] Tested API endpoint locally

### Phase 5: Nginx Configuration
- [ ] Copied `nginx.conf` to `/etc/nginx/sites-available/sellit`
- [ ] Updated domain name in config
- [ ] Created symlink in `sites-enabled`
- [ ] Removed default Nginx site
- [ ] Tested Nginx configuration (`sudo nginx -t`)
- [ ] Reloaded Nginx
- [ ] Verified HTTP access works

### Phase 6: SSL/HTTPS Setup
- [ ] Domain DNS A record pointing to EC2 IP
- [ ] Waited for DNS propagation (can take up to 48 hours)
- [ ] Ran Certbot to obtain SSL certificate
- [ ] Verified SSL certificate installed
- [ ] Tested HTTPS access
- [ ] Verified HTTP redirects to HTTPS

### Phase 7: Final Configuration
- [ ] Updated `.env` with production domain URLs
- [ ] Restarted application
- [ ] Tested all API endpoints
- [ ] Verified Socket.IO connection (if applicable)
- [ ] Checked file uploads work (if applicable)

### Phase 8: Security & Hardening
- [ ] Reviewed security group rules
- [ ] Verified fail2ban is running
- [ ] Set up automatic security updates
- [ ] Configured database backups
- [ ] Set up log rotation
- [ ] Reviewed firewall rules

### Phase 9: Monitoring & Maintenance
- [ ] Set up PM2 monitoring
- [ ] Configured log viewing
- [ ] Created backup scripts
- [ ] Set up cron jobs for backups
- [ ] Documented deployment process
- [ ] Created runbook for common issues

## Post-Deployment Verification

### Application Health
- [ ] Health endpoint responds: `curl https://yourdomain.com/api/health`
- [ ] API endpoints accessible
- [ ] Database queries working
- [ ] File uploads working (if applicable)
- [ ] Authentication working
- [ ] Real-time features working (Socket.IO)

### Performance
- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] PM2 process stable
- [ ] Nginx serving requests properly

### Security
- [ ] HTTPS enforced
- [ ] No HTTP access (redirects to HTTPS)
- [ ] Security headers present
- [ ] Rate limiting working
- [ ] No exposed sensitive endpoints

### Monitoring
- [ ] Logs accessible
- [ ] Error tracking working
- [ ] Uptime monitoring configured (optional)

## Common Issues to Check

- [ ] Environment variables all set correctly
- [ ] Database connection string correct
- [ ] Port 5000 not exposed publicly (only via Nginx)
- [ ] CORS configured for production domain
- [ ] File permissions correct (`/var/www/sellit`, `/var/log/sellit`)
- [ ] PM2 process persists after reboot
- [ ] SSL certificate auto-renewal configured

## Documentation

- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Backup/restore procedures documented
- [ ] Troubleshooting guide accessible
- [ ] Team members have access to documentation

## Rollback Plan

- [ ] Previous version backed up
- [ ] Database backup available
- [ ] Know how to revert code changes
- [ ] Know how to restore database

---

**Last Updated:** 2024
