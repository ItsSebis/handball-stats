import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardEntry } from "./leaderboard";

export function LeaderboardCard({
  title,
  entries,
  unit,
}: {
  title: string;
  entries: LeaderboardEntry[];
  unit: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Statistiken.</p>
        ) : (
          <ol className="flex flex-col gap-1 text-sm">
            {entries.map((entry, index) => (
              <li key={entry.playerId}>
                {index + 1}. {entry.name} — {entry.value} {unit}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
