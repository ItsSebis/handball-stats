import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameTally, MostRecentGame } from "../games/queries";
import { TallyTable } from "../games/tally-table";

export function RecentGameCard({
  game,
  tally,
  showDiscipline,
}: {
  game: MostRecentGame | null;
  tally: GameTally | null;
  showDiscipline: boolean;
}) {
  const isClosed = game !== null && game.ownScore !== null && game.opponentScore !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Letztes Spiel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {game === null ? (
          <p className="text-sm text-muted-foreground">Noch keine Spiele.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/games/${game.id}`} className="text-sm font-medium underline">
                {game.opponentName}
              </Link>
              {isClosed && <Badge>{`${game.ownScore}:${game.opponentScore}`}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {game.date} · {game.seasonLabel}
            </p>
            {isClosed && tally && (
              <TallyTable fieldPlayers={tally.fieldPlayers} keepers={tally.keepers} showDiscipline={showDiscipline} />
            )}
          </div>
        )}
        <Link href="/games" className="text-sm underline">
          Alle Spiele
        </Link>
      </CardContent>
    </Card>
  );
}
