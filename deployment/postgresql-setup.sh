#!/bin/bash

###############################################################################
# PostgreSQL Database Setup Script
# Creates database, user, and configures security
###############################################################################

set -e  # Exit on any error

echo "🗄️  Setting up PostgreSQL database..."

# Prompt for database credentials
read -p "Enter database name (default: sellit): " DB_NAME
DB_NAME=${DB_NAME:-sellit}

read -p "Enter database user (default: sellit_user): " DB_USER
DB_USER=${DB_USER:-sellit_user}

read -sp "Enter database password: " DB_PASSWORD
echo ""

# Create database and user
echo "📦 Creating database and user..."
sudo -u postgres psql <<EOF
-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

-- Exit
\q
EOF

# Configure PostgreSQL for remote connections (optional, for security)
echo "🔒 Configuring PostgreSQL security..."

# Backup original config
sudo cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.backup
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Update postgresql.conf to listen on localhost only (more secure)
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf

# Configure pg_hba.conf for local connections only
# This ensures only local connections are allowed (more secure)
sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
echo "🧪 Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed!"
    exit 1
fi

# Generate DATABASE_URL
DB_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"
echo ""
echo "✅ PostgreSQL setup completed successfully!"
echo ""
echo "📋 Database Information:"
echo "   Database Name: $DB_NAME"
echo "   Database User: $DB_USER"
echo "   Database URL: postgresql://$DB_USER:****@localhost:5432/$DB_NAME?schema=public"
echo ""
echo "⚠️  IMPORTANT: Save this DATABASE_URL for your .env file:"
echo "   DATABASE_URL=$DB_URL"
echo ""
echo "💡 Security Notes:"
echo "   - PostgreSQL is configured to accept connections only from localhost"
echo "   - For remote access, you'll need to configure pg_hba.conf and security groups"
echo "   - Consider using SSL for production database connections"
