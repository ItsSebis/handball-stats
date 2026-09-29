import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeQuote, formatQuote, QUOTES, type QuoteKey } from "./format-quote";
import type { PlayerStats } from "./queries";

function quoteCell(p: PlayerStats, key: QuoteKey): string {
  const { made, attempts } = QUOTES[key];
  return formatQuote(computeQuote(p[made], p[attempts]));
}

function PlayerGroup({
  title,
  players,
  regularKey,
  sevenMeterKey,
}: {
  title: string;
  players: PlayerStats[];
  regularKey: QuoteKey;
  sevenMeterKey: QuoteKey;
}) {
  if (players.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 px-1 text-sm font-medium">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background">Spieler</TableHead>
            <TableHead>Regulär</TableHead>
            <TableHead>7m</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((p) => (
            <TableRow key={p.playerId}>
              <TableCell className="sticky left-0 bg-background font-medium">{p.name}</TableCell>
              <TableCell>{quoteCell(p, regularKey)}</TableCell>
              <TableCell>{quoteCell(p, sevenMeterKey)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PlayerStatsTable({ players }: { players: PlayerStats[] }) {
  const fieldPlayers = players.filter((p) => p.type === "FIELD");
  const keepers = players.filter((p) => p.type === "KEEPER");

  return (
    <div className="flex flex-col gap-6">
      <PlayerGroup title="Feldspieler" players={fieldPlayers} regularKey="wurfquote" sevenMeterKey="quote7m" />
      <PlayerGroup title="Torhüter" players={keepers} regularKey="paradenquote" sevenMeterKey="quote7mParaden" />
    </div>
  );
}
