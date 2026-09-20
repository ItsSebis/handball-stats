"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";

export async function createSeason(_prevState: string | undefined, formData: FormData) {
  const team = await getCurrentTeam();
  if (!team) return "Nicht angemeldet.";

  const label = String(formData.get("label") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!label || !startDate || !endDate) {
    return "Bitte Bezeichnung, Start- und Enddatum angeben.";
  }
  if (startDate > endDate) {
    return "Das Startdatum muss vor dem Enddatum liegen.";
  }

  try {
    await db.insert(seasons).values({ teamId: team.id, label, startDate, endDate });
  } catch (error) {
    console.error("createSeason: failed to insert season", error);
    return "Saison konnte nicht erstellt werden. Bitte erneut versuchen.";
  }

  redirect("/seasons");
}
