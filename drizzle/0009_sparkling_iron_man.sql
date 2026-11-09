CREATE TYPE "public"."team_group" AS ENUM('sound_booth', 'praise_team');--> statement-breakpoint
CREATE TABLE "praise_team_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_id" uuid NOT NULL,
	"roster_id" uuid NOT NULL,
	"kind" "sound_booth_availability_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "praise_team_availability_date_roster_unique" UNIQUE("date_id","roster_id")
);
--> statement-breakpoint
CREATE TABLE "praise_team_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "praise_team_dates_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "praise_team_singers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_id" uuid NOT NULL,
	"roster_id" uuid NOT NULL,
	"status" "sound_booth_status" DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "praise_team_singers_date_roster_unique" UNIQUE("date_id","roster_id")
);
--> statement-breakpoint
CREATE TABLE "team_group_membership" (
	"roster_id" uuid NOT NULL,
	"group" "team_group" NOT NULL,
	CONSTRAINT "team_group_membership_roster_id_group_pk" PRIMARY KEY("roster_id","group")
);
--> statement-breakpoint
ALTER TABLE "praise_team_availability" ADD CONSTRAINT "praise_team_availability_date_id_praise_team_dates_id_fk" FOREIGN KEY ("date_id") REFERENCES "public"."praise_team_dates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "praise_team_availability" ADD CONSTRAINT "praise_team_availability_roster_id_sound_booth_roster_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."sound_booth_roster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "praise_team_singers" ADD CONSTRAINT "praise_team_singers_date_id_praise_team_dates_id_fk" FOREIGN KEY ("date_id") REFERENCES "public"."praise_team_dates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "praise_team_singers" ADD CONSTRAINT "praise_team_singers_roster_id_sound_booth_roster_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."sound_booth_roster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_group_membership" ADD CONSTRAINT "team_group_membership_roster_id_sound_booth_roster_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."sound_booth_roster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Every person already on the roster today has Sound Booth access right
-- now, with no separate "group" concept to grant it through -- this keeps
-- that access exactly as it is instead of silently revoking everyone the
-- moment this table starts being checked. ON CONFLICT makes it safe to
-- apply more than once.
INSERT INTO "team_group_membership" ("roster_id", "group")
SELECT "id", 'sound_booth' FROM "sound_booth_roster"
ON CONFLICT DO NOTHING;