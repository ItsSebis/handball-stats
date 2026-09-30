CREATE TYPE "public"."role" AS ENUM('COACH', 'ADMIN');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'COACH' NOT NULL;