module.exports = {
  apps: [
    {
      name: 'um-counterparty-maps',
      script: 'npm start',
      watch_delay: 1000,
      ignore_watch: ['node_modules', '\\.git', '*.log'],
      out_file: '/dev/null',
      error_file: '/dev/null',
    },
  ],
}
