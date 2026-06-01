// Load env vars FIRST — before any other require() that reads process.env
require('dotenv').config();

const app    = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = parseInt(process.env.PORT) || 3001;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Bulk Mailer API running → http://localhost:${PORT}`);
  logger.info(`   Health:     http://localhost:${PORT}/api/health`);
  logger.info(`   Senders:    http://localhost:${PORT}/api/senders`);
  logger.info(`   Recipients: http://localhost:${PORT}/api/recipients`);
  logger.info(`   Logs:       http://localhost:${PORT}/api/upload-logs`);
  logger.info(`   Env:        ${process.env.NODE_ENV || 'development'}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force-exit if it takes too long
  setTimeout(() => {
    logger.error('Forced exit after 10s');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled promise rejections ──────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // In production you might want to crash here and let a process manager restart
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message);
  process.exit(1); // Always exit on uncaught exceptions
});
