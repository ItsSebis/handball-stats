import type { PlayerStats } from "../stats/queries";

export type LeaderboardEntry = { name: string; value: number };

function topBy(players: PlayerStats[], value: (player: PlayerStats) => number): LeaderboardEntry[] {
  return players
    .map((player) => ({ name: player.name, value: value(player) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value) // stable sort + getPlayerStats' asc(players.name) input order => name-ascending tiebreak
    .slice(0, 3);
}

export function topScorers(players: PlayerStats[]): LeaderboardEntry[] {
  return topBy(players, (player) => player.goalsRegular + player.goals7m);
}

export function topKeepers(players: PlayerStats[]): LeaderboardEntry[] {
  return topBy(players, (player) => player.savesRegular + player.saves7m);
}
