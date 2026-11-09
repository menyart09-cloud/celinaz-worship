CREATE TABLE "oos_visible_dates" (
	"date" date PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
