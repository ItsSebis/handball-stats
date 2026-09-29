CREATE TYPE "public"."stat_event_type" AS ENUM('SHOT_REGULAR_GOAL', 'SHOT_REGULAR_MISS', 'SHOT_7M_GOAL', 'SHOT_7M_MISS', 'SAVE_REGULAR', 'GOAL_CONCEDED_REGULAR', 'SAVE_7M', 'GOAL_CONCEDED_7M', 'TWO_MIN_PENALTY', 'YELLOW_CARD', 'RED_CARD');--> statement-breakpoint
CREATE TABLE "player_game_stat_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_participation_id" uuid NOT NULL,
	"event_type" "stat_event_type" NOT NULL,
	"undone" boolean DEFAULT false NOT NULL,
	"undone_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_game_stat_events" ADD CONSTRAINT "player_game_stat_events_game_participation_id_game_participations_id_fk" FOREIGN KEY ("game_participation_id") REFERENCES "public"."game_participations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_game_stat_events_game_participation_id_idx" ON "player_game_stat_events" USING btree ("game_participation_id");