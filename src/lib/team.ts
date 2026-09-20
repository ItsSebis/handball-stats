import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";

export async function getCurrentTeam() {
  const session = await auth();
  if (!session?.user) return null;

  const [team] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.userId, session.user.id));

  return team ?? null;
}
