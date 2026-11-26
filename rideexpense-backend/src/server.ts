import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';

async function bootstrap() {
  await connectDatabase(env.MONGODB_URI);
  console.log('Connected to MongoDB and synchronized collections & indexes');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`Vehixa API listening on http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start Vehixa backend:', error);
  process.exit(1);
});
