import { describe, expect, it } from "vitest";
import type { PlayerStats } from "../stats/queries";
import { topKeepers, topScorers } from "./leaderboard";

function player(overrides: Partial<PlayerStats> & { name: string }): PlayerStats {
  return {
    playerId: overrides.name,
    type: "FIELD",
    shotsRegular: 0,
    goalsRegular: 0,
    shots7m: 0,
    goals7m: 0,
    shotsFacedRegular: 0,
    savesRegular: 0,
    shotsFaced7m: 0,
    saves7m: 0,
    ...overrides,
  };
}

describe("topScorers", () => {
  it("sums regular and 7m goals into a total", () => {
    const players = [player({ name: "Anna", goalsRegular: 3, goals7m: 2 })];
    expect(topScorers(players)).toEqual([{ playerId: "Anna", name: "Anna", value: 5 }]);
  });

  it("filters out players with zero goals", () => {
    const players = [
      player({ name: "Anna", goalsRegular: 3 }),
      player({ name: "Bea", goalsRegular: 0, goals7m: 0 }),
    ];
    expect(topScorers(players)).toEqual([{ playerId: "Anna", name: "Anna", value: 3 }]);
  });

  it("sorts descending by total", () => {
    const players = [
      player({ name: "Anna", goalsRegular: 2 }),
      player({ name: "Bea", goalsRegular: 8 }),
      player({ name: "Clara", goalsRegular: 5 }),
    ];
    expect(topScorers(players)).toEqual([
      { playerId: "Bea", name: "Bea", value: 8 },
      { playerId: "Clara", name: "Clara", value: 5 },
      { playerId: "Anna", name: "Anna", value: 2 },
    ]);
  });

  it("breaks ties by the input's existing name-ascending order", () => {
    // getPlayerStats already returns players ordered by asc(players.name); relying on that plus
    // Array.prototype.sort's stability, equal totals keep name-ascending order here.
    const players = [
      player({ name: "Anna", goalsRegular: 4 }),
      player({ name: "Bea", goalsRegular: 4 }),
      player({ name: "Clara", goalsRegular: 4 }),
    ];
    expect(topScorers(players)).toEqual([
      { playerId: "Anna", name: "Anna", value: 4 },
      { playerId: "Bea", name: "Bea", value: 4 },
      { playerId: "Clara", name: "Clara", value: 4 },
    ]);
  });

  it("slices to the top 3 when more than 3 players qualify", () => {
    const players = [
      player({ name: "Anna", goalsRegular: 1 }),
      player({ name: "Bea", goalsRegular: 5 }),
      player({ name: "Clara", goalsRegular: 4 }),
      player({ name: "Dora", goalsRegular: 3 }),
      player({ name: "Eva", goalsRegular: 2 }),
    ];
    expect(topScorers(players)).toEqual([
      { playerId: "Bea", name: "Bea", value: 5 },
      { playerId: "Clara", name: "Clara", value: 4 },
      { playerId: "Dora", name: "Dora", value: 3 },
    ]);
  });
});

describe("topKeepers", () => {
  it("sums regular and 7m saves into a total", () => {
    const players = [player({ name: "Nina", type: "KEEPER", savesRegular: 6, saves7m: 1 })];
    expect(topKeepers(players)).toEqual([{ playerId: "Nina", name: "Nina", value: 7 }]);
  });

  it("filters out players with zero saves", () => {
    const players = [
      player({ name: "Nina", type: "KEEPER", savesRegular: 6 }),
      player({ name: "Olli", type: "KEEPER", savesRegular: 0, saves7m: 0 }),
    ];
    expect(topKeepers(players)).toEqual([{ playerId: "Nina", name: "Nina", value: 6 }]);
  });
});
