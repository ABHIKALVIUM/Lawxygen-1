import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/client';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  verifyAccessToken,
  REFRESH_COOKIE_OPTIONS,
} from '../utils/jwt';
import { createError } from '../middleware/errorHandler';

const BCRYPT_ROUNDS = 12;

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  name: string | null;
  avatar_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function issueTokens(userId: string, email: string, res: Response) {
  const accessToken = signAccessToken({ userId, email });
  const rawRefresh = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefresh);
  const expiresAt = getRefreshTokenExpiry();

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  res.cookie('refresh_token', rawRefresh, REFRESH_COOKIE_OPTIONS);

  return { accessToken };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function signup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name: string;
    };

    if (!email || !password || !name) {
      throw createError('Email, password, and name are required', 400);
    }
    if (!validateEmail(email)) {
      throw createError('Invalid email address', 400);
    }
    if (password.length < 8) {
      throw createError('Password must be at least 8 characters', 400);
    }

    const existing = await query<UserRow>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      throw createError('An account with this email already exists', 409);
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await query<UserRow>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email.toLowerCase(), password_hash, name]
    );

    const user = result.rows[0];
    const { accessToken } = await issueTokens(user.id, user.email, res);

    res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    const result = await query<UserRow>(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || !user.password_hash) {
      throw createError('Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw createError('Invalid email or password', 401);
    }

    const { accessToken } = await issueTokens(user.id, user.email, res);

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawToken = req.cookies?.refresh_token as string | undefined;

    if (!rawToken) {
      throw createError('No refresh token', 401);
    }

    const tokenHash = hashRefreshToken(rawToken);
    const result = await query<{
      id: string;
      user_id: string;
      expires_at: string;
      revoked: boolean;
    }>(
      `SELECT id, user_id, expires_at, revoked
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    const tokenRow = result.rows[0];
    if (!tokenRow || tokenRow.revoked || new Date(tokenRow.expires_at) < new Date()) {
      res.clearCookie('refresh_token');
      throw createError('Invalid or expired refresh token', 401);
    }

    // Revoke old token (rotation)
    await query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1',
      [tokenRow.id]
    );

    const userResult = await query<UserRow>(
      'SELECT id, email, name FROM users WHERE id = $1',
      [tokenRow.user_id]
    );
    const user = userResult.rows[0];
    if (!user) {
      throw createError('User not found', 401);
    }

    const { accessToken } = await issueTokens(user.id, user.email, res);

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawToken = req.cookies?.refresh_token as string | undefined;

    if (rawToken) {
      const tokenHash = hashRefreshToken(rawToken);
      await query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1',
        [tokenHash]
      );
    }

    res.clearCookie('refresh_token', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError('Unauthorized', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const result = await query<UserRow>(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = result.rows[0];
    if (!user) throw createError('User not found', 404);

    res.json({ user });
  } catch (err) {
    next(err);
  }
}
