import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { users } from "@/db/schema";
import { createAuthToken } from "@/lib/auth-token";
import { testDb, testPool } from "@/test/db";
import { createUserFixture } from "@/test/user-fixture";
import { resetPassword } from "./actions";

vi.mock("@/db", async () => {
  const { testDb } = await import("@/test/db");
  return { db: testDb };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

afterAll(async () => {
  await testPool.end();
});

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("resetPassword", () => {
  it("updates the password and consumes the token on success", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "PASSWORD_RESET");

    const result = await resetPassword(undefined, formData({ token, newPassword: "brandnewpass" }));
    expect(result).toBeUndefined();

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(updated?.passwordHash).not.toBe("unused");

    const reuse = await resetPassword(undefined, formData({ token, newPassword: "anotherpass" }));
    expect(reuse).toBe("Link ungültig oder abgelaufen.");
  });

  it("rejects a too-short password without touching the token", async () => {
    const user = await createUserFixture();
    const token = await createAuthToken(user.id, "PASSWORD_RESET");

    const result = await resetPassword(undefined, formData({ token, newPassword: "short" }));
    expect(result).toBe("Passwort muss mindestens 8 Zeichen haben.");

    const success = await resetPassword(undefined, formData({ token, newPassword: "longenoughpass" }));
    expect(success).toBeUndefined();
  });

  it("rejects an invalid token", async () => {
    const result = await resetPassword(undefined, formData({ token: "does-not-exist", newPassword: "longenoughpass" }));
    expect(result).toBe("Link ungültig oder abgelaufen.");
  });
});
