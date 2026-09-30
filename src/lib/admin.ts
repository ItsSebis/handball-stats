import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function getCurrentAdmin() {
  const session = await auth();
  if (!session?.user) return null;

  const [user] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (user?.role !== "ADMIN") return null;

  return { id: user.id, email: user.email };
}
