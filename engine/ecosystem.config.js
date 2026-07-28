// ─── PM2 Ecosystem Configuration ────────────────────────────────
// Usage: pm2 start ecosystem.config.js
// Requires: pm2 install (npm i -g pm2)
//
// This config manages both services for non-containerized deployments.

module.exports = {
  apps: [
    {
      name: 'ce-pipeline',
      script: 'packages/pipeline-orchestrator/dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3456',
        LOG_LEVEL: 'info',
      },
      env_file: '.env',
      log_file: 'logs/pipeline.log',
      error_file: 'logs/pipeline-err.log',
      merge_logs: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      listen_timeout: 8000,
    },
    {
      name: 'ce-saas-api',
      script: 'packages/saas-api/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '8080',
        LOG_LEVEL: 'info',
        CORS_ORIGIN: 'false',
      },
      env_file: '.env',
      log_file: 'logs/saas.log',
      error_file: 'logs/saas-err.log',
      merge_logs: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      kill_timeout: 15000,
      listen_timeout: 10000,
    },
  ],
};
