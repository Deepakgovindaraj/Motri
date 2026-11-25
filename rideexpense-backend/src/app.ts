import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import apiV1Routes from './routes';

function getAllowedOrigins(): string[] {
  const configured = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.VERCEL_URL) {
    configured.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    configured.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    configured.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  return Array.from(new Set(configured));
}

async function ensureDatabaseMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (env.NODE_ENV === 'test' || mongoose.connection.readyState === 1) {
    next();
    return;
  }

  try {
    await connectDatabase(env.MONGODB_URI);
    next();
  } catch (error) {
    next(error);
  }
}

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.use('/api/v1', ensureDatabaseMiddleware, apiRateLimiter, apiV1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
