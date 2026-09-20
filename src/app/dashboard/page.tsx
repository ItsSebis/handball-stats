import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [team] = await db.select().from(teams).where(eq(teams.userId, session.user.id));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{team?.name ?? "Team"}</h1>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="rounded border px-4 py-2">
          Abmelden
        </button>
      </form>
    </main>
  );
}
