ALTER TABLE "rooms_messages" ADD COLUMN "quoted_message_id" uuid;--> statement-breakpoint
ALTER TABLE "rooms_messages" ADD COLUMN "quoted_excerpt" text;--> statement-breakpoint
ALTER TABLE "rooms_messages" ADD CONSTRAINT "rooms_messages_quoted_message_id_rooms_messages_id_fk" FOREIGN KEY ("quoted_message_id") REFERENCES "public"."rooms_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rooms_messages_quoted_message_id" ON "rooms_messages" USING btree ("quoted_message_id");--> statement-breakpoint
CREATE TABLE "message_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"snapshot" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "message_asset" ADD CONSTRAINT "message_asset_message_id_rooms_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."rooms_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_asset" ADD CONSTRAINT "message_asset_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_asset_message_id_idx" ON "message_asset" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_asset_asset_id_idx" ON "message_asset" USING btree ("asset_id");
