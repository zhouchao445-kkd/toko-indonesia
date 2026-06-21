import { Request, Response, NextFunction } from 'express';

/**
 * Request logger middleware.
 * Logs method, path, status code, and duration for every request.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture the original end method
  const originalEnd = res.end.bind(res);

  // Override end to log after response is sent
  res.end = function (...args: any[]): Response {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    console.log(
      `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms`
    );

    return originalEnd(...args);
  } as any;

  next();
}
