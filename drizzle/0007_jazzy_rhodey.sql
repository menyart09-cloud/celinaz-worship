CREATE TYPE "public"."sound_booth_availability_kind" AS ENUM('available', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."sound_booth_position" AS ENUM('MediaShout', 'Sound', 'Live');--> statement-breakpoint
CREATE TYPE "public"."sound_booth_status" AS ENUM('pending', 'yes', 'no');--> statement-breakpoint
CREATE TABLE "sound_booth_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_id" uuid NOT NULL,
	"position" "sound_booth_position" NOT NULL,
	"roster_id" uuid,
	"status" "sound_booth_status" DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sound_booth_assignments_date_position_unique" UNIQUE("date_id","position")
);
--> statement-breakpoint
CREATE TABLE "sound_booth_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_id" uuid NOT NULL,
	"roster_id" uuid NOT NULL,
	"kind" "sound_booth_availability_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sound_booth_availability_date_roster_unique" UNIQUE("date_id","roster_id")
);
--> statement-breakpoint
CREATE TABLE "sound_booth_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sound_booth_dates_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "sound_booth_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pin_hash" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sound_booth_roster_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "sound_booth_assignments" ADD CONSTRAINT "sound_booth_assignments_date_id_sound_booth_dates_id_fk" FOREIGN KEY ("date_id") REFERENCES "public"."sound_booth_dates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_booth_assignments" ADD CONSTRAINT "sound_booth_assignments_roster_id_sound_booth_roster_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."sound_booth_roster"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_booth_availability" ADD CONSTRAINT "sound_booth_availability_date_id_sound_booth_dates_id_fk" FOREIGN KEY ("date_id") REFERENCES "public"."sound_booth_dates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_booth_availability" ADD CONSTRAINT "sound_booth_availability_roster_id_sound_booth_roster_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."sound_booth_roster"("id") ON DELETE cascade ON UPDATE no action;