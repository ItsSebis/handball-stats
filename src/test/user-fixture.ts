import { randomUUID } from "node:crypto";
import { users } from "@/db/schema";
import { testDb } from "./db";

export async function createUserFixture() {
  const [user] = await testDb
    .insert(users)
    .values({ email: `${randomUUID()}@example.test`, passwordHash: "unused" })
    .returning();

  return user!;
}
