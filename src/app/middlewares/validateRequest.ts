import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

// Validate request body according to the zod schema
const validateRequest =
  (zodSchema: ZodTypeAny) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let data = req.body;

      if (typeof req.body?.data === "string") {
        try {
          data = JSON.parse(req.body.data);
        } catch {
          // Keep data as is if not valid JSON string
        }
      }

      // Check if schema expects { body: ... }
      const payloadToValidate =
        (zodSchema as any).shape?.body !== undefined
          ? { body: data, query: req.query, params: req.params }
          : data;

      const parsedData = await zodSchema.parseAsync(payloadToValidate);
      req.body =
        (parsedData as any).body !== undefined
          ? (parsedData as any).body
          : parsedData;

      return next();
    } catch (err: unknown) {
      next(err);
    }
  };

export default validateRequest;