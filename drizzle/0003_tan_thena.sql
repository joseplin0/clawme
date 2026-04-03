CREATE TABLE "rooms_members" (
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar DEFAULT 'member' NOT NULL,
	"last_read_message_id" uuid,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_members_room_id_user_id_pk" PRIMARY KEY("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "rooms_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"role" varchar DEFAULT 'user' NOT NULL,
	"parts" json NOT NULL,
	"status" varchar DEFAULT 'done' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "room_members" CASCADE;--> statement-breakpoint
DROP TABLE "room_messages" CASCADE;--> statement-breakpoint
ALTER TABLE "rooms_members" ADD CONSTRAINT "rooms_members_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms_members" ADD CONSTRAINT "rooms_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms_messages" ADD CONSTRAINT "rooms_messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms_messages" ADD CONSTRAINT "rooms_messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rooms_members_room_id" ON "rooms_members" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_rooms_members_user_id" ON "rooms_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_rooms_messages_room_id" ON "rooms_messages" USING btree ("room_id");