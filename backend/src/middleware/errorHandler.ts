import { NextFunction, Request, Response } from "express";
import { Error as MongooseError } from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/** Single place that turns any error into a consistent JSON response. */
// Express recognises error handlers by their 4 arguments, so `_next` must stay.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }

  // Bad ObjectId in a URL param, e.g. /submissions/abc
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ error: `Invalid ${err.path}` });
    return;
  }

  // Unique index violation (duplicate email, duplicate link in a campaign)
  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    res.status(409).json({ error: "Duplicate value: this record already exists" });
    return;
  }

  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal server error" });
}
