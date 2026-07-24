import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const signAccessToken = (payload: { userId: string; email: string }): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const getRefreshTokenExpiry = (): Date => {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
};

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: '/',
};
