ALTER TABLE "llm" RENAME TO "model_config";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "llm_provider_id" TO "model_config_id";