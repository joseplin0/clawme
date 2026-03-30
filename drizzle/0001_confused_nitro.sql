CREATE TABLE "bot_mcp" (
	"bot_id" uuid NOT NULL,
	"mcp_id" uuid NOT NULL,
	CONSTRAINT "bot_mcp_bot_id_mcp_id_pk" PRIMARY KEY("bot_id","mcp_id")
);
--> statement-breakpoint
CREATE TABLE "llm" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"base_url" text,
	"api_key" text,
	"model_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"transport" text NOT NULL,
	"command" text,
	"args" json,
	"url" text
);
--> statement-breakpoint
DROP TABLE "BotMcpConnection" CASCADE;--> statement-breakpoint
DROP TABLE "LlmProvider" CASCADE;--> statement-breakpoint
DROP TABLE "McpServer" CASCADE;--> statement-breakpoint
DROP TABLE "SystemConfig" CASCADE;