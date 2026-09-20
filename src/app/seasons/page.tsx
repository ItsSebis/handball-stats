import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { CreateSeasonForm } from "./create-season-form";

export default async function SeasonsPage() {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  const teamSeasons = await db
    .select({
      id: seasons.id,
      label: seasons.label,
      startDate: seasons.startDate,
      endDate: seasons.endDate,
    })
    .from(seasons)
    .where(eq(seasons.teamId, team.id))
    .orderBy(desc(seasons.startDate));

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Saisons</h1>

      <ul className="flex w-full max-w-sm flex-col gap-1 text-sm">
        {teamSeasons.map((season) => (
          <li key={season.id}>
            {season.label} ({season.startDate} – {season.endDate})
          </li>
        ))}
      </ul>

      <CreateSeasonForm />
    </main>
  );
}
