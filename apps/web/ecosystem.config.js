module.exports = {
  apps: [
    {
      name: 'singularity-web',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/singularity/apps/web',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 3000,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/singularity-web-error.log',
      out_file: '/var/log/pm2/singularity-web-out.log',
      log_file: '/var/log/pm2/singularity-web.log',
      time: true,
    },
  ],
};
