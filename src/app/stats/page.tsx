import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { PlayerStatsTable } from "./player-stats-table";
import { getGameTrend, getPlayerStats, getTeamStats, resolveSeasonScope } from "./queries";
import { SeasonSwitcher } from "./season-switcher";
import { StatsTrendChart } from "./stats-trend-chart";
import { TeamSummaryCards } from "./team-summary-cards";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ seasonId?: string }> }) {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  const { seasonId } = await searchParams;

  const teamSeasons = await db
    .select({ id: seasons.id, label: seasons.label, startDate: seasons.startDate, endDate: seasons.endDate })
    .from(seasons)
    .where(eq(seasons.teamId, team.id))
    .orderBy(desc(seasons.startDate));

  const { scope, activeSeasonId } = resolveSeasonScope(teamSeasons, seasonId);

  const [teamStats, playerStats, trend] = await Promise.all([
    getTeamStats(team.id, scope),
    getPlayerStats(team.id, scope),
    getGameTrend(team.id, scope),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center">
      <PageHeader title="Statistiken" backHref="/dashboard" />

      <div className="flex w-full flex-1 flex-col items-center gap-6 px-4 py-4">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <SeasonSwitcher seasons={teamSeasons} activeSeasonId={activeSeasonId} />
          <TeamSummaryCards stats={teamStats} />
          <PlayerStatsTable players={playerStats} />
          <StatsTrendChart points={trend} />
        </div>
      </div>
    </main>
  );
}
