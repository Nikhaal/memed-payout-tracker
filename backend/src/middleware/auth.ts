import { NextFunction, Request, Response } from "express";
import { Role } from "../models/User";
import { AppError } from "../utils/AppError";
import { TokenPayload, verifyToken } from "../utils/jwt";

// Tell TypeScript that authenticated requests carry `req.user`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/** Requires a valid `Authorization: Bearer <token>` header. Sets req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing or malformed Authorization header"));
  }

  try {
    req.user = verifyToken(header.slice("Bearer ".length));
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}

/** Allows only the given roles. Must run after `authenticate`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, "Not authenticated"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, `This action requires role: ${roles.join(" or ")}`));
    }
    next();
  };
}
