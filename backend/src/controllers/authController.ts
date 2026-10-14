import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { IUser, User } from "../models/User";
import { AppError } from "../utils/AppError";
import { signToken } from "../utils/jwt";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["brand", "creator"]),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

/** Never send the password hash to the client. */
function publicUser(user: IUser) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = signupSchema.parse(req.body);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role });

  const token = signToken({ id: user._id.toString(), role: user.role });
  res.status(201).json({ token, user: publicUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  // Same message for "no such user" and "wrong password" so attackers
  // cannot discover which emails are registered.
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = signToken({ id: user._id.toString(), role: user.role });
  res.json({ token, user: publicUser(user) });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  res.json({ user: publicUser(user) });
}
