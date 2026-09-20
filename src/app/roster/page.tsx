import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { ImportPlayersForm } from "./import-players-form";

export default async function RosterPage() {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  const roster = await db
    .select({ id: players.id, name: players.name, type: players.type })
    .from(players)
    .where(eq(players.teamId, team.id));

  const fieldPlayers = roster.filter((player) => player.type === "FIELD");
  const keepers = roster.filter((player) => player.type === "KEEPER");

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Kader</h1>

      <div className="flex w-full max-w-sm flex-col gap-4 text-sm">
        <div>
          <h2 className="font-medium">Feldspieler</h2>
          <ul className="list-inside list-disc">
            {fieldPlayers.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-medium">Torhüter</h2>
          <ul className="list-inside list-disc">
            {keepers.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ul>
        </div>
      </div>

      <ImportPlayersForm />
    </main>
  );
}
