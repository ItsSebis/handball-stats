import { boolean, date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["COACH", "ADMIN"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("COACH"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authTokenTypeEnum = pgEnum("auth_token_type", ["EMAIL_VERIFICATION", "PASSWORD_RESET"]);

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: authTokenTypeEnum("type").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const playerTypeEnum = pgEnum("player_type", ["FIELD", "KEEPER"]);

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: playerTypeEnum("type").notNull(),
  active: boolean("active").notNull().default(true),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  opponentName: text("opponent_name").notNull(),
  date: date("date").notNull(),
  ownScore: integer("own_score"),
  opponentScore: integer("opponent_score"),
});

export const gameParticipations = pgTable("game_participations", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  present: boolean("present").notNull(),
});

export const playerGameStats = pgTable("player_game_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameParticipationId: uuid("game_participation_id")
    .notNull()
    .unique()
    .references(() => gameParticipations.id, { onDelete: "cascade" }),
  shotsRegular: integer("shots_regular").notNull().default(0),
  goalsRegular: integer("goals_regular").notNull().default(0),
  shots7m: integer("shots_7m").notNull().default(0),
  goals7m: integer("goals_7m").notNull().default(0),
  shotsFacedRegular: integer("shots_faced_regular").notNull().default(0),
  savesRegular: integer("saves_regular").notNull().default(0),
  shotsFaced7m: integer("shots_faced_7m").notNull().default(0),
  saves7m: integer("saves_7m").notNull().default(0),
  twoMinPenalties: integer("two_min_penalties").notNull().default(0),
  yellowCard: boolean("yellow_card").notNull().default(false),
  redCard: boolean("red_card").notNull().default(false),
});

export const statEventTypeEnum = pgEnum("stat_event_type", [
  "SHOT_REGULAR_GOAL",
  "SHOT_REGULAR_MISS",
  "SHOT_7M_GOAL",
  "SHOT_7M_MISS",
  "SAVE_REGULAR",
  "GOAL_CONCEDED_REGULAR",
  "SAVE_7M",
  "GOAL_CONCEDED_7M",
  "TWO_MIN_PENALTY",
  "YELLOW_CARD",
  "RED_CARD",
]);

// Append-only log backing `playerGameStats`: one row per recorded tap, soft-deleted (never
// hard-deleted) on undo so the aggregate counters stay reconstructable and auditable.
export const playerGameStatEvents = pgTable(
  "player_game_stat_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameParticipationId: uuid("game_participation_id")
      .notNull()
      .references(() => gameParticipations.id, { onDelete: "cascade" }),
    eventType: statEventTypeEnum("event_type").notNull(),
    undone: boolean("undone").notNull().default(false),
    undoneAt: timestamp("undone_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("player_game_stat_events_game_participation_id_idx").on(table.gameParticipationId)],
);
