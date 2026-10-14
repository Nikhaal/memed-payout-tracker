import { Schema, model, Types } from "mongoose";

export type Role = "brand" | "creator";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    // Stored lowercase so "A@x.com" and "a@x.com" are the same account.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["brand", "creator"], required: true },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
