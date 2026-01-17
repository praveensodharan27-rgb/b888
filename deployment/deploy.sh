#!/bin/bash

###############################################################################
# Deployment Script
# Pulls code from GitHub, installs dependencies, runs migrations, and restarts app
###############################################################################

set -e  # Exit on any error

APP_DIR="/var/www/sellit"
BACKEND_DIR="$APP_DIR/backend"
BRANCH="${1:-main}"  # Default to main branch

echo "🚀 Starting deployment..."

# Navigate to application directory
cd $APP_DIR

# Backup current .env file if it exists
if [ -f "$BACKEND_DIR/.env" ]; then
    echo "💾 Backing up .env file..."
    cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Pull latest code from GitHub
echo "📥 Pulling latest code from GitHub (branch: $BRANCH)..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Install/update dependencies
echo "📦 Installing dependencies..."
cd $BACKEND_DIR
npm install --production

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

# Run database migrations
echo "🗄️  Running database migrations..."
npm run prisma:migrate deploy

# Build frontend (if needed)
# Uncomment if you're building frontend on the server
# echo "🏗️  Building frontend..."
# cd $APP_DIR/frontend
# npm install --production
# npm run build

# Restart application with PM2
echo "🔄 Restarting application..."
cd $APP_DIR
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Show PM2 status
echo ""
echo "📊 Application status:"
pm2 status

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   - Check logs: pm2 logs sellit-backend"
echo "   - Monitor: pm2 monit"
echo "   - Test API: curl https://yourdomain.com/api/health"
