# AWS EC2 Deployment Package

This directory contains all the scripts and configuration files needed to deploy the SellIt application on AWS EC2.

## Quick Start

1. **Launch EC2 Instance** (see `DEPLOYMENT.md` for details)
2. **Run Initial Setup:**
   ```bash
   scp -i your-key.pem deployment/ec2-setup.sh ubuntu@your-ec2-ip:~/
   ssh -i your-key.pem ubuntu@your-ec2-ip
   chmod +x ec2-setup.sh && ./ec2-setup.sh
   ```

3. **Set Up Database:**
   ```bash
   scp -i your-key.pem deployment/postgresql-setup.sh ubuntu@your-ec2-ip:~/
   ssh -i your-ec2-ip
   chmod +x postgresql-setup.sh && ./postgresql-setup.sh
   ```

4. **Deploy Application:**
   ```bash
   # Clone repository
   cd /var/www/sellit
   git clone https://github.com/yourusername/sellit.git .
   
   # Set up environment
   cp deployment/env.template backend/.env
   nano backend/.env  # Fill in your values
   
   # Install and start
   cd backend
   npm install --production
   npm run prisma:generate
   npm run prisma:migrate deploy
   
   # Start with PM2
   cd ..
   cp deployment/pm2.ecosystem.config.js ecosystem.config.js
   pm2 start ecosystem.config.js
   pm2 save
   ```

5. **Configure Nginx:**
   ```bash
   sudo cp deployment/nginx.conf /etc/nginx/sites-available/sellit
   sudo nano /etc/nginx/sites-available/sellit  # Update domain
   sudo ln -s /etc/nginx/sites-available/sellit /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Set Up SSL:**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## Files Overview

### Scripts

- **`ec2-setup.sh`** - Initial server setup (Node.js, PostgreSQL, Nginx, PM2, etc.)
- **`postgresql-setup.sh`** - Database creation and security configuration
- **`deploy.sh`** - Automated deployment script (pull code, install, migrate, restart)

### Configuration Files

- **`pm2.ecosystem.config.js`** - PM2 process manager configuration
- **`nginx.conf`** - Nginx reverse proxy and SSL configuration
- **`env.template`** - Environment variables template

### Documentation

- **`DEPLOYMENT.md`** - Complete step-by-step deployment guide
- **`AWS_SECURITY_GROUPS.md`** - Security group configuration guide
- **`README.md`** - This file

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- Domain name (optional but recommended)
- GitHub repository access
- SSH key pair for EC2 access

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Restrict SSH access** - Only allow your IP in security groups
3. **Use strong passwords** - For database, JWT secrets, etc.
4. **Enable HTTPS** - Always use SSL certificates in production
5. **Regular updates** - Keep system and dependencies updated
6. **Backup regularly** - Database and important files

## Support

For detailed instructions, see:
- **`DEPLOYMENT.md`** - Full deployment walkthrough
- **`AWS_SECURITY_GROUPS.md`** - Security configuration

## Troubleshooting

Common issues and solutions are documented in `DEPLOYMENT.md` under the Troubleshooting section.

---

**Version:** 1.0  
**Last Updated:** 2024
