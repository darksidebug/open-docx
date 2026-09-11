// pm2 process list for the production container: runs the Next.js app
// (its default start command) and the real-time collaboration server in
// parallel, inside one container, each restarted independently if it crashes.
// Started via `pm2-runtime start ecosystem.config.js` (see Dockerfile CMD).
module.exports = {
  apps: [
    {
      name: 'next-app',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'collab-server',
      script: 'npm',
      args: 'run collab-server',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
