const app = require('./app');
const config = require('./config');
const db = require('./db');

async function startServer() {
  try {
    await db.initDb();

    const server = app.listen(config.port, () => {
      console.log(`🚀 [Finathon Auth Backend] Server running on http://localhost:${config.port}`);
      console.log(`   - Environment: ${config.nodeEnv}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await db.closeDb();
        console.log('✅ Server and database connections closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
