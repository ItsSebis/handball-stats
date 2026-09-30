import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { authTokenTypeEnum, authTokens } from "@/db/schema";

export type AuthTokenType = (typeof authTokenTypeEnum.enumValues)[number];

const EXPIRY_MS: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

export async function createAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRY_MS[type]);
  await db.insert(authTokens).values({ userId, type, token, expiresAt });
  return token;
}

// Read-only: whether `token` of `type` could still be consumed right now. Used only to decide
// whether to render the reset-password form; never marks the token used itself (consumption
// happens atomically on submit, in resetPasswordWithToken below).
export async function isAuthTokenValid(token: string, type: AuthTokenType): Promise<boolean> {
  const [row] = await db
    .select({ id: authTokens.id })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.token, token),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    );
  return !!row;
}

// Atomically consumes an EMAIL_VERIFICATION token and, only if that succeeds, sets the owning
// user's emailVerifiedAt. One statement so a double-clicked verification link can't race itself
// and partially apply twice — see ARCHITECTURE.md's "Phase 4 (event-log undo)" note on
// neon-http lacking db.transaction(): a dependent multi-step write becomes one raw statement
// with a data-modifying CTE instead of two separate queries.
export async function verifyEmailWithToken(token: string): Promise<boolean> {
  const result = await db.execute<{ id: string }>(sql`
    WITH consumed AS (
      UPDATE auth_tokens
      SET used_at = now()
      WHERE token = ${token} AND type = 'EMAIL_VERIFICATION' AND used_at IS NULL AND expires_at > now()
      RETURNING user_id
    )
    UPDATE users
    SET email_verified_at = now()
    WHERE id IN (SELECT user_id FROM consumed)
    RETURNING id
  `);
  return result.rows.length > 0;
}

// Atomically consumes a PASSWORD_RESET token and, only if that succeeds, sets the owning user's
// passwordHash. Same one-statement-CTE technique as verifyEmailWithToken, for the same reason
// (guards against a double-submitted reset form applying the token twice).
export async function resetPasswordWithToken(token: string, passwordHash: string): Promise<boolean> {
  const result = await db.execute<{ id: string }>(sql`
    WITH consumed AS (
      UPDATE auth_tokens
      SET used_at = now()
      WHERE token = ${token} AND type = 'PASSWORD_RESET' AND used_at IS NULL AND expires_at > now()
      RETURNING user_id
    )
    UPDATE users
    SET password_hash = ${passwordHash}
    WHERE id IN (SELECT user_id FROM consumed)
    RETURNING id
  `);
  return result.rows.length > 0;
}
