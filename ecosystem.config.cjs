module.exports = {
  apps: [
    {
      name: 'tranle-tasks',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3500
      }
    }
  ]
};
