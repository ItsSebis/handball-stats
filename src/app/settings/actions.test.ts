import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authTokens, users } from "@/db/schema";
import { sendEmailChangeConfirmation } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";
import { testDb, testPool } from "@/test/db";
import { changeEmail, changePassword } from "./actions";

vi.mock("@/db", async () => {
  const { testDb } = await import("@/test/db");
  return { db: testDb };
});

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmailChangeConfirmation: vi.fn(),
}));

// revalidatePath requires a live Next.js request context that doesn't exist under vitest; these
// tests are about the SQL/auth logic, not Next's cache invalidation, so it's mocked out.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// next/server's after() requires a live Next.js request scope that doesn't exist under vitest;
// mirrors forgot-password/actions.test.ts's approach of invoking the callback immediately.
vi.mock("next/server", () => ({
  after: (callback: () => unknown) => callback(),
}));

afterAll(async () => {
  await testPool.end();
});

async function createUserWithPassword(password: string) {
  const passwordHash = await hashPassword(password);
  const [user] = await testDb
    .insert(users)
    .values({ email: `${randomUUID()}@example.test`, passwordHash })
    .returning();
  return user!;
}

function mockSessionFor(userId: string) {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);
}

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("changePassword", () => {
  it("updates the password hash when the current password is correct and the new one is valid", async () => {
    const user = await createUserWithPassword("originalpass");
    mockSessionFor(user.id);

    const result = await changePassword(
      undefined,
      formData({ currentPassword: "originalpass", newPassword: "brandnewpass" }),
    );
    expect(result).toBeUndefined();

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(updated?.passwordHash).not.toBe(user.passwordHash);
    expect(await verifyPassword("originalpass", updated!.passwordHash)).toBe(false);
    expect(await verifyPassword("brandnewpass", updated!.passwordHash)).toBe(true);
  });

  it("rejects the wrong current password and leaves the hash untouched", async () => {
    const user = await createUserWithPassword("originalpass");
    mockSessionFor(user.id);

    const result = await changePassword(
      undefined,
      formData({ currentPassword: "wrongpassword", newPassword: "brandnewpass" }),
    );
    expect(result).toBe("Aktuelles Passwort ist falsch.");

    const [unchanged] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(unchanged?.passwordHash).toBe(user.passwordHash);
  });

  it("rejects a new password shorter than 8 characters", async () => {
    const user = await createUserWithPassword("originalpass");
    mockSessionFor(user.id);

    const result = await changePassword(
      undefined,
      formData({ currentPassword: "originalpass", newPassword: "short" }),
    );
    expect(result).toBe("Passwort muss mindestens 8 Zeichen haben.");

    const [unchanged] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(unchanged?.passwordHash).toBe(user.passwordHash);
  });
});

describe("changeEmail", () => {
  it("updates the email, resets emailVerifiedAt, and issues an EMAIL_VERIFICATION token", async () => {
    const user = await createUserWithPassword("originalpass");
    mockSessionFor(user.id);
    const newEmail = `${randomUUID()}@example.test`;

    const result = await changeEmail(
      undefined,
      formData({ currentPassword: "originalpass", newEmail }),
    );
    expect(result).toBeUndefined();

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(updated?.email).toBe(newEmail);
    expect(updated?.emailVerifiedAt).toBeNull();

    const tokens = await testDb.select().from(authTokens).where(eq(authTokens.userId, user.id));
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.type).toBe("EMAIL_VERIFICATION");
    expect(sendEmailChangeConfirmation).toHaveBeenCalledWith(newEmail, tokens[0]?.token);
  });

  it("rejects the wrong current password and leaves the email untouched", async () => {
    const user = await createUserWithPassword("originalpass");
    mockSessionFor(user.id);

    const result = await changeEmail(
      undefined,
      formData({ currentPassword: "wrongpassword", newEmail: `${randomUUID()}@example.test` }),
    );
    expect(result).toBe("Aktuelles Passwort ist falsch.");

    const [unchanged] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(unchanged?.email).toBe(user.email);
  });

  it("rejects an email already used by another account and leaves the row untouched", async () => {
    const user = await createUserWithPassword("originalpass");
    const otherUser = await createUserWithPassword("otherpassword");
    mockSessionFor(user.id);

    const result = await changeEmail(
      undefined,
      formData({ currentPassword: "originalpass", newEmail: otherUser.email }),
    );
    expect(result).toBe("Diese E-Mail-Adresse wird bereits verwendet.");

    const [unchanged] = await testDb.select().from(users).where(eq(users.id, user.id));
    expect(unchanged?.email).toBe(user.email);
  });
});
