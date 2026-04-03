import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { AppError } from './error-handler.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors
          .map((error) => `${error.path.join('.')}: ${error.message}`)
          .join(', ');
        next(new AppError(400, 'VALIDATION_ERROR', message));
        return;
      }

      next(err);
    }
  };
}
