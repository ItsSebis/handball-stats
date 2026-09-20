CREATE TYPE "public"."player_type" AS ENUM('FIELD', 'KEEPER');--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "player_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"label" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;