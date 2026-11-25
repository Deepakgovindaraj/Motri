import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Database validation failed',
      code: 'MONGOOSE_VALIDATION_ERROR',
      details,
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: `Invalid identifier for ${err.path}`,
      code: 'INVALID_ID',
    });
    return;
  }

  // Handle MongoDB duplicate key error (E11000)
  const mongoErr = err as Error & { code?: number; keyPattern?: Record<string, unknown> };
  if (mongoErr.code === 11000) {
    const fields = Object.keys(mongoErr.keyPattern ?? {});
    res.status(409).json({
      success: false,
      message: `Duplicate value for ${fields.join(', ') || 'unique field'}`,
      code: 'DUPLICATE_KEY',
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
