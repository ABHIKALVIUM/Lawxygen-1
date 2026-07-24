import { Router } from 'express';
import passport from 'passport';
import { signup, login, refresh, logout, getMe } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  REFRESH_COOKIE_OPTIONS,
} from '../utils/jwt';
import { query } from '../db/client';

const router = Router();

// Email/password auth
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth?error=oauth_failed` }),
  async (req, res) => {
    try {
      // Passport attaches the user profile to req.user
      const profile = req.user as {
        id: string;
        email: string;
        name: string;
        avatar_url?: string;
      };

      const accessToken = signAccessToken({ userId: profile.id, email: profile.email });
      const rawRefresh = generateRefreshToken();
      const tokenHash = hashRefreshToken(rawRefresh);
      const expiresAt = getRefreshTokenExpiry();

      await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [profile.id, tokenHash, expiresAt]
      );

      res.cookie('refresh_token', rawRefresh, REFRESH_COOKIE_OPTIONS);

      // Redirect to frontend with access token in URL fragment
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/auth/callback?token=${encodeURIComponent(accessToken)}&name=${encodeURIComponent(profile.name || '')}&email=${encodeURIComponent(profile.email)}`
      );
    } catch (err) {
      console.error('[OAuth] Callback error:', err);
      res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_failed`);
    }
  }
);

export default router;
