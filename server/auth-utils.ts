import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;
const JWT_SECRET = new TextEncoder().encode(
  ENV.jwtSecret || "your-super-secret-key-change-in-production"
);

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
  
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    throw new Error(`Password verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: "user" | "admin";
  iat?: number;
  exp?: number;
}

export async function generateAccessToken(
  userId: number,
  email: string,
  role: "user" | "admin" = "user",
  expiresIn: string = "1h"
): Promise<string> {
  try {
    const token = await new SignJWT({
      userId,
      email,
      role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    throw new Error(`Token generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function generateRefreshToken(
  userId: number,
  expiresIn: string = "30d"
): Promise<string> {
  try {
    const token = await new SignJWT({
      userId,
      type: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    throw new Error(`Refresh token generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as JWTPayload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error instanceof Error ? error.message : "Invalid token"}`);
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function isStrongPassword(password: string): {
  isStrong: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isStrong: errors.length === 0,
    errors,
  };
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320;
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function shouldLockAccount(failedAttempts: number, maxAttempts: number = 5): boolean {
  return failedAttempts >= maxAttempts;
}

export function calculateLockoutDuration(failedAttempts: number): number {
  const baseMinutes = 15;
  const multiplier = Math.pow(2, Math.max(0, failedAttempts - 5));
  return baseMinutes * multiplier * 60 * 1000;
}
