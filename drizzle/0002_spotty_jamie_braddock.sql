CREATE TABLE "oos_item_excluded_songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oos_item_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	CONSTRAINT "oos_item_excluded_songs_unique" UNIQUE("oos_item_id","song_id")
);
--> statement-breakpoint
ALTER TABLE "oos_item_excluded_songs" ADD CONSTRAINT "oos_item_excluded_songs_oos_item_id_oos_items_id_fk" FOREIGN KEY ("oos_item_id") REFERENCES "public"."oos_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oos_item_excluded_songs" ADD CONSTRAINT "oos_item_excluded_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;