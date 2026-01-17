/**
 * PM2 Ecosystem Configuration
 * Production-ready process management for Node.js application
 */

module.exports = {
  apps: [
    {
      name: 'sellit-backend',
      script: './backend/src/server.js',
      cwd: '/var/www/sellit',
      instances: 2, // Use 2 instances for load balancing (adjust based on CPU cores)
      exec_mode: 'cluster', // Cluster mode for load balancing
      watch: false, // Disable watch in production
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/sellit/backend-error.log',
      out_file: '/var/log/sellit/backend-out.log',
      log_file: '/var/log/sellit/backend-combined.log',
      time: true, // Prepend timestamp to logs
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Health check
      health_check_grace_period: 3000,
    },
  ],

  // Deployment configuration (optional, for automated deployments)
  deploy: {
    production: {
      user: 'ubuntu', // Change to your EC2 user
      host: ['your-ec2-ip-or-domain'], // Update with your EC2 IP or domain
      ref: 'origin/main', // Git branch
      repo: 'git@github.com:yourusername/sellit.git', // Update with your repo
      path: '/var/www/sellit',
      'post-deploy': 'npm install && npm run prisma:generate && npm run prisma:migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git -y',
    },
  },
};
