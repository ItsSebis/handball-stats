import { boolean, date, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
