"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { games, gameParticipations, players, seasons } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";

export async function createGame(_prevState: string | undefined, formData: FormData) {
  const team = await getCurrentTeam();
  if (!team) return "Nicht angemeldet.";

  const seasonId = String(formData.get("seasonId") ?? "");
  const opponentName = String(formData.get("opponentName") ?? "").trim();
  const date = String(formData.get("date") ?? "");

  if (!seasonId || !opponentName || !date) {
    return "Bitte Saison, Gegner und Datum angeben.";
  }

  const [season] = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(and(eq(seasons.id, seasonId), eq(seasons.teamId, team.id)));
  if (!season) {
    return "Ungültige Saison.";
  }

  const activeRoster = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.teamId, team.id), eq(players.active, true)));
  if (activeRoster.length === 0) {
    return "Kein aktiver Kader vorhanden.";
  }

  const gameId = crypto.randomUUID();

  try {
    await db.batch([
      db.insert(games).values({ id: gameId, teamId: team.id, seasonId, opponentName, date }),
      db.insert(gameParticipations).values(
        activeRoster.map((player) => ({
          gameId,
          playerId: player.id,
          present: formData.get(`present_${player.id}`) === "on",
        })),
      ),
    ]);
  } catch (error) {
    console.error("createGame: failed to insert game", error);
    return "Spiel konnte nicht erstellt werden. Bitte erneut versuchen.";
  }

  redirect("/games");
}
