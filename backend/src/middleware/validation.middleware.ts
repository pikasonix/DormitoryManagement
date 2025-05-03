import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

// Middleware factory for Zod schema validation
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Validate request data against provided schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        // Format validation errors
        const formattedErrors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        const validationError = new Error("Dữ liệu không hợp lệ.");
        (validationError as any).statusCode = 400;
        (validationError as any).errors = formattedErrors;
        (validationError as any).isValidationError = true;

        next(validationError);
      } else {
        next(error);
      }
    }
  };
};