import 'dotenv/config';
import passport from 'passport';
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from 'passport-google-oauth20';
import { query } from '../db/client';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/google/callback`,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar_url = profile.photos?.[0]?.value;
        const google_id = profile.id;

        if (!email) {
          return done(new Error('No email from Google profile'));
        }

        // Try to find existing user by google_id
        let result = await query<UserRow>(
          'SELECT id, email, name, avatar_url FROM users WHERE google_id = $1',
          [google_id]
        );

        if (result.rows.length > 0) {
          // Existing Google user
          const user = result.rows[0];
          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name || name,
            avatar_url: user.avatar_url || avatar_url,
          } as UserProfile);
        }

        // Try to find by email (link accounts)
        result = await query<UserRow>(
          'SELECT id, email, name, avatar_url FROM users WHERE email = $1',
          [email.toLowerCase()]
        );

        if (result.rows.length > 0) {
          // Link Google to existing account
          const user = result.rows[0];
          await query(
            'UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3',
            [google_id, avatar_url, user.id]
          );
          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name || name,
            avatar_url: user.avatar_url || avatar_url,
          } as UserProfile);
        }

        // Create new user
        const newUser = await query<UserRow>(
          `INSERT INTO users (email, google_id, name, avatar_url)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, name, avatar_url`,
          [email.toLowerCase(), google_id, name, avatar_url]
        );

        const created = newUser.rows[0];
        return done(null, {
          id: created.id,
          email: created.email,
          name: created.name || name,
          avatar_url: created.avatar_url || avatar_url,
        } as UserProfile);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;
