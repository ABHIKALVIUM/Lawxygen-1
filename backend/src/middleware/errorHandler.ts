import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  console.error(`[Error] ${statusCode} - ${err.message}`, {
    stack: err.stack,
    operational: err.isOperational,
  });

  res.status(statusCode).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
