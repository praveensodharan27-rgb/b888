#!/bin/bash

###############################################################################
# EC2 Server Setup Script for OLX-Style App
# This script sets up a fresh Ubuntu EC2 instance with all required software
###############################################################################

set -e  # Exit on any error

echo "🚀 Starting EC2 server setup for SellIt application..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install essential build tools
echo "🔧 Installing build essentials..."
sudo apt-get install -y build-essential curl wget git unzip software-properties-common

# Install Node.js 20.x (LTS)
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node -v)
npm_version=$(npm -v)
echo "✅ Node.js installed: $node_version"
echo "✅ npm installed: $npm_version"

# Install PM2 globally
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install Certbot for SSL certificates
echo "📦 Installing Certbot for SSL..."
sudo apt-get install -y certbot python3-certbot-nginx

# Install AWS CLI (optional, for S3 access if needed)
echo "📦 Installing AWS CLI..."
sudo apt-get install -y awscli

# Install fail2ban for security
echo "🔒 Installing fail2ban for security..."
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure firewall (UFW)
echo "🔥 Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp  # Backend API port (optional, if not using Nginx reverse proxy)
sudo ufw reload

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/sellit
sudo chown -R $USER:$USER /var/www/sellit

# Create logs directory
sudo mkdir -p /var/log/sellit
sudo chown -R $USER:$USER /var/log/sellit

# Create uploads directory
sudo mkdir -p /var/www/sellit/backend/uploads
sudo chown -R $USER:$USER /var/www/sellit/backend/uploads

echo ""
echo "✅ EC2 server setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure PostgreSQL (run: sudo -u postgres psql)"
echo "   2. Clone your repository to /var/www/sellit"
echo "   3. Set up environment variables"
echo "   4. Run database migrations"
echo "   5. Start the application with PM2"
echo "   6. Configure Nginx reverse proxy"
echo "   7. Set up SSL certificate with Certbot"
echo ""
echo "📖 See deployment/DEPLOYMENT.md for detailed instructions"
