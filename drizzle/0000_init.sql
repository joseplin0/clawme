CREATE TABLE "asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar NOT NULL,
	"url" text NOT NULL,
	"file_name" text,
	"size" integer,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"duration" integer,
	"cover_url" text,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BotMcpConnection" (
	"botId" uuid NOT NULL,
	"mcpServerId" uuid NOT NULL,
	CONSTRAINT "BotMcpConnection_botId_mcpServerId_pk" PRIMARY KEY("botId","mcpServerId")
);
--> statement-breakpoint
CREATE TABLE "Comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"moment_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "LlmProvider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"baseUrl" text,
	"apiKey" text,
	"modelId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "McpServer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"transport" text NOT NULL,
	"command" text,
	"args" json,
	"url" text
);
--> statement-breakpoint
CREATE TABLE "moment_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moment_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"usage" varchar NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moment_collection" (
	"user_id" uuid NOT NULL,
	"moment_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "moment_collection_user_id_moment_id_pk" PRIMARY KEY("user_id","moment_id")
);
--> statement-breakpoint
CREATE TABLE "moment_like" (
	"user_id" uuid NOT NULL,
	"moment_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "moment_like_user_id_moment_id_pk" PRIMARY KEY("user_id","moment_id")
);
--> statement-breakpoint
CREATE TABLE "moment_tag" (
	"moment_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "moment_tag_moment_id_tag_id_pk" PRIMARY KEY("moment_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "moment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"content" text,
	"like_count" integer DEFAULT 0 NOT NULL,
	"context" text,
	"type" varchar DEFAULT 'mixed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_members" (
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar DEFAULT 'member' NOT NULL,
	"last_read_message_id" uuid,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "room_members_room_id_user_id_pk" PRIMARY KEY("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "room_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"role" varchar DEFAULT 'user' NOT NULL,
	"parts" json NOT NULL,
	"status" varchar DEFAULT 'done' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar DEFAULT 'single' NOT NULL,
	"name" varchar(100),
	"avatar" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"intimacy" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_follows_from_user_id_to_user_id_pk" PRIMARY KEY("from_user_id","to_user_id")
);
--> statement-breakpoint
CREATE TABLE "SystemConfig" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"isInitialized" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tag_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar DEFAULT 'human' NOT NULL,
	"username" text NOT NULL,
	"nickname" text NOT NULL,
	"avatar" text,
	"intro" text,
	"role" text,
	"catchphrase" text,
	"mbti" text,
	"current_mood" text DEFAULT '平静',
	"created_by_id" uuid,
	"password_hash" text,
	"api_secret" text,
	"llm_provider_id" uuid,
	"webhook_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_api_secret_unique" UNIQUE("api_secret")
);
--> statement-breakpoint
CREATE TABLE "workflow_trigger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"type" varchar NOT NULL,
	"config" json
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ownerId" uuid NOT NULL,
	"nodes" json NOT NULL,
	"edges" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_moment_id_moment_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_asset" ADD CONSTRAINT "moment_asset_moment_id_moment_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_asset" ADD CONSTRAINT "moment_asset_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_collection" ADD CONSTRAINT "moment_collection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_collection" ADD CONSTRAINT "moment_collection_moment_id_moment_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_like" ADD CONSTRAINT "moment_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_like" ADD CONSTRAINT "moment_like_moment_id_moment_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_tag" ADD CONSTRAINT "moment_tag_moment_id_moment_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_tag" ADD CONSTRAINT "moment_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment" ADD CONSTRAINT "moment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_user_id_idx" ON "asset" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "asset_type_idx" ON "asset" USING btree ("type");--> statement-breakpoint
CREATE INDEX "comment_moment_id_idx" ON "Comment" USING btree ("moment_id");--> statement-breakpoint
CREATE INDEX "moment_asset_moment_id_idx" ON "moment_asset" USING btree ("moment_id");--> statement-breakpoint
CREATE INDEX "moment_asset_asset_id_idx" ON "moment_asset" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "moment_user_id_idx" ON "moment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "moment_created_at_idx" ON "moment" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_room_members_room_id" ON "room_members" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_room_members_user_id" ON "room_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_room_messages_room_id" ON "room_messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_follows_from_user" ON "user_follows" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "idx_follows_to_user" ON "user_follows" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "idx_follows_intimacy" ON "user_follows" USING btree ("intimacy" DESC);--> statement-breakpoint
CREATE INDEX "idx_rooms_type" ON "rooms" USING btree ("type");
