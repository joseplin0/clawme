CREATE TABLE "pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"site_name" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"remote_cover_url" text,
	"preview_asset_id" uuid NOT NULL,
	"preview_mode" varchar NOT NULL,
	"source_room_id" uuid NOT NULL,
	"source_message_id" uuid NOT NULL,
	"source_type" varchar NOT NULL,
	"status" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_preview_asset_id_asset_id_fk" FOREIGN KEY ("preview_asset_id") REFERENCES "public"."asset"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_source_room_id_rooms_id_fk" FOREIGN KEY ("source_room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_source_message_id_rooms_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."rooms_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pins_owner_id_idx" ON "pins" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "pins_created_at_idx" ON "pins" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pins_source_room_id_idx" ON "pins" USING btree ("source_room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pins_owner_normalized_url_uidx" ON "pins" USING btree ("owner_id","normalized_url");
