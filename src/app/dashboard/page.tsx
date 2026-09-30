import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentTeam } from "@/lib/team";
import { getGameTally, getMostRecentGame } from "../games/queries";
import { getPlayerStats } from "../stats/queries";
import { LeaderboardCard } from "./leaderboard-card";
import { topKeepers, topScorers } from "./leaderboard";
import { RecentGameCard } from "./recent-game-card";

export default async function DashboardPage() {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  const [playerStats, recentGame] = await Promise.all([
    getPlayerStats(team.id, { kind: "all" }),
    getMostRecentGame(team.id),
  ]);

  const isClosed = recentGame !== null && recentGame.ownScore !== null && recentGame.opponentScore !== null;
  const tally = isClosed ? await getGameTally(recentGame.id) : null;
  const showDiscipline = process.env.HIDE_DISCIPLINE_STATS !== "true";

  return (
    <main className="flex min-h-screen flex-col items-center">
      <PageHeader
        title={team.name}
        actions={
          <>
            <Button variant="ghost" size="icon" aria-label="Einstellungen" nativeButton={false} render={<Link href="/settings" />}>
              <Settings />
            </Button>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="ghost" size="icon" type="submit" aria-label="Abmelden">
                <LogOut />
              </Button>
            </form>
          </>
        }
      />

      <div className="flex w-full flex-1 flex-col items-center gap-6 px-4 py-4">
        <div className="grid w-full max-w-sm grid-cols-2 gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/roster" />}>
            Kader
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/seasons" />}>
            Saisons
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/games" />}>
            Spiele
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/stats" />}>
            Statistiken
          </Button>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-6">
          <LeaderboardCard title="Top-Torschützen" entries={topScorers(playerStats)} unit="Tore" />
          <LeaderboardCard title="Top-Torhüter" entries={topKeepers(playerStats)} unit="Paraden" />
          <RecentGameCard game={recentGame} tally={tally} showDiscipline={showDiscipline} />
        </div>
      </div>
    </main>
  );
}
