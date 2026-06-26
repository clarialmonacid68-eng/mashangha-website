module.exports = {
  apps: [
    {
      name: "mshcode",
      script: "pnpm",
      args: "start --hostname 127.0.0.1 --port 3000",
      cwd: "/var/www/mshcode/app",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "768M",
    },
  ],
};
