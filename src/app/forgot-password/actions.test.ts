import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { authTokens } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { testDb, testPool } from "@/test/db";
import { createUserFixture } from "@/test/user-fixture";
import { requestPasswordReset } from "./actions";

vi.mock("@/db", async () => {
  const { testDb } = await import("@/test/db");
  return { db: testDb };
});

vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

// next/server's after() requires a live Next.js request scope that doesn't exist under vitest;
// these tests are about the token/enumeration logic, not Next's deferred-execution scheduling, so
// it's mocked to invoke its callback immediately.
vi.mock("next/server", () => ({
  after: (callback: () => unknown) => callback(),
}));

afterAll(async () => {
  await testPool.end();
});

function formData(email: string) {
  const data = new FormData();
  data.set("email", email);
  return data;
}

describe("requestPasswordReset", () => {
  it("creates a token and sends an email for an existing account", async () => {
    const user = await createUserFixture();

    const message = await requestPasswordReset(undefined, formData(user.email));

    expect(message).toMatch(/existiert/);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(user.email, expect.any(String));

    const tokens = await testDb.select().from(authTokens).where(eq(authTokens.userId, user.id));
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.type).toBe("PASSWORD_RESET");
  });

  it("returns the same message and sends no email for an unknown address", async () => {
    vi.mocked(sendPasswordResetEmail).mockClear();

    const message = await requestPasswordReset(undefined, formData("nobody@example.test"));

    expect(message).toMatch(/existiert/);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
