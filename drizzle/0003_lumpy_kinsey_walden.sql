CREATE TABLE "player_game_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_participation_id" uuid NOT NULL,
	"shots_regular" integer DEFAULT 0 NOT NULL,
	"goals_regular" integer DEFAULT 0 NOT NULL,
	"shots_7m" integer DEFAULT 0 NOT NULL,
	"goals_7m" integer DEFAULT 0 NOT NULL,
	"shots_faced_regular" integer DEFAULT 0 NOT NULL,
	"saves_regular" integer DEFAULT 0 NOT NULL,
	"shots_faced_7m" integer DEFAULT 0 NOT NULL,
	"saves_7m" integer DEFAULT 0 NOT NULL,
	"two_min_penalties" integer DEFAULT 0 NOT NULL,
	"yellow_card" boolean DEFAULT false NOT NULL,
	"red_card" boolean DEFAULT false NOT NULL,
	CONSTRAINT "player_game_stats_game_participation_id_unique" UNIQUE("game_participation_id")
);
--> statement-breakpoint
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_game_participation_id_game_participations_id_fk" FOREIGN KEY ("game_participation_id") REFERENCES "public"."game_participations"("id") ON DELETE cascade ON UPDATE no action;