import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <main className="flex min-h-screen flex-col items-center">
      <PageHeader title="Saisons" backHref="/dashboard" />

      <div className="flex w-full flex-col items-center gap-6 px-4 py-8">
        <div className="w-full max-w-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Saison</TableHead>
                <TableHead>Zeitraum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamSeasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell>{season.label}</TableCell>
                  <TableCell>
                    {season.startDate} – {season.endDate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <CreateSeasonForm />
      </div>
    </main>
  );
}
