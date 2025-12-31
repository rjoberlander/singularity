module.exports = {
  apps: [
    {
      name: 'singularity-api',
      script: 'dist/index.js',
      cwd: '/var/www/singularity/apps/api',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 3000,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/singularity-api-error.log',
      out_file: '/var/log/pm2/singularity-api-out.log',
      log_file: '/var/log/pm2/singularity-api.log',
      time: true,
    },
  ],
};
