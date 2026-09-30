import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { authTokens, users } from "@/db/schema";
import { testDb, testPool } from "@/test/db";
import { createUserFixture } from "@/test/user-fixture";
import { createAuthToken, isAuthTokenValid, resetPasswordWithToken, verifyEmailWithToken } from "./auth-token";

vi.mock("@/db", async () => {
  const { testDb } = await import("@/test/db");
  return { db: testDb };
});

afterAll(async () => {
  await testPool.end();
});

describe("createAuthToken / isAuthTokenValid", () => {
  it("a freshly created token is valid", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");

    expect(await isAuthTokenValid(token, "EMAIL_VERIFICATION")).toBe(true);
  });

  it("a token of the wrong type is not valid", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");

    expect(await isAuthTokenValid(token, "PASSWORD_RESET")).toBe(false);
  });

  it("an expired token is not valid", async () => {
    const user = await createUserFixture();
    const [row] = await testDb
      .insert(authTokens)
      .values({
        userId: user.id,
        type: "PASSWORD_RESET",
        token: `expired-${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() - 1000),
      })
      .returning();

    expect(await isAuthTokenValid(row!.token, "PASSWORD_RESET")).toBe(false);
  });
});

describe("verifyEmailWithToken", () => {
  it("consumes the token and sets emailVerifiedAt", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");

    expect(await verifyEmailWithToken(token)).toBe(true);

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(updated?.emailVerifiedAt).not.toBeNull();
  });

  it("a token can only be consumed once", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");

    expect(await verifyEmailWithToken(token)).toBe(true);
    expect(await verifyEmailWithToken(token)).toBe(false);
  });

  it("an unknown token is rejected", async () => {
    expect(await verifyEmailWithToken("does-not-exist")).toBe(false);
  });
});

describe("resetPasswordWithToken", () => {
  it("consumes the token and updates passwordHash", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "PASSWORD_RESET");

    expect(await resetPasswordWithToken(token, "new-hash")).toBe(true);

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(updated?.passwordHash).toBe("new-hash");
  });

  it("rejects a token of the wrong type", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");

    expect(await resetPasswordWithToken(token, "new-hash")).toBe(false);

    const [unchanged] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(unchanged?.passwordHash).toBe("unused");
  });

  it("rejects an already-used token", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "PASSWORD_RESET");

    expect(await resetPasswordWithToken(token, "first-hash")).toBe(true);
    expect(await resetPasswordWithToken(token, "second-hash")).toBe(false);

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(updated?.passwordHash).toBe("first-hash");
  });
});
