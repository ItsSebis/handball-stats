"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";

function parseNames(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function importPlayers(_prevState: string | undefined, formData: FormData) {
  const team = await getCurrentTeam();
  if (!team) return "Nicht angemeldet.";

  const fieldNames = parseNames(formData.get("fieldPlayers"));
  const keeperNames = parseNames(formData.get("keepers"));

  if (fieldNames.length === 0 && keeperNames.length === 0) {
    return "Bitte mindestens einen Namen eingeben.";
  }

  const rows = [
    ...fieldNames.map((name) => ({ teamId: team.id, name, type: "FIELD" as const })),
    ...keeperNames.map((name) => ({ teamId: team.id, name, type: "KEEPER" as const })),
  ];

  try {
    await db.insert(players).values(rows);
  } catch (error) {
    console.error("importPlayers: failed to insert players", error);
    return "Spieler konnten nicht importiert werden. Bitte erneut versuchen.";
  }

  redirect("/roster");
}
