import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { signIn } from "@/auth";
import { authTokens, users } from "@/db/schema";
import { sendVerificationEmail } from "@/lib/email";
import { testDb, testPool } from "@/test/db";
import { signup } from "./actions";

vi.mock("@/db", async () => {
  const { testDb } = await import("@/test/db");
  return { db: testDb };
});

vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn(),
}));

afterAll(async () => {
  await testPool.end();
});

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("signup", () => {
  it("issues an email verification token and sends the confirmation email", async () => {
    const email = `${crypto.randomUUID()}@example.test`;

    await signup(undefined, formData({ teamName: "Test Team", email, password: "longenoughpass" }));

    const [user] = await testDb.select().from(users).where(eq(users.email, email));
    expect(user).toBeDefined();
    expect(user?.emailVerifiedAt).toBeNull();

    const tokens = await testDb.select().from(authTokens).where(eq(authTokens.userId, user!.id));
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.type).toBe("EMAIL_VERIFICATION");

    expect(sendVerificationEmail).toHaveBeenCalledWith(email, tokens[0]?.token);
    expect(signIn).toHaveBeenCalledWith("credentials", { email, password: "longenoughpass", redirectTo: "/dashboard" });
  });
});
