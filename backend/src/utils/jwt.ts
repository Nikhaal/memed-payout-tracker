import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "../models/User";

export interface TokenPayload {
  id: string;
  role: Role;
}

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

/** Throws if the token is invalid or expired. */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  return { id: decoded.id as string, role: decoded.role as Role };
}
