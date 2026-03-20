CREATE TYPE "public"."AttachmentType" AS ENUM('IMAGE', 'CODE', 'DOCUMENT', 'LINK', 'WORKFLOW_RESULT');--> statement-breakpoint
CREATE TYPE "public"."MessageRole" AS ENUM('USER', 'ASSISTANT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."MessageStatus" AS ENUM('GENERATING', 'DONE', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."ParticipantRole" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."SessionType" AS ENUM('DIRECT', 'GROUP');--> statement-breakpoint
CREATE TYPE "public"."TriggerType" AS ENUM('MANUAL', 'SCHEDULE', 'FEED_EVENT', 'WEBHOOK');--> statement-breakpoint
CREATE TYPE "public"."UserType" AS ENUM('HUMAN', 'BOT');--> statement-breakpoint
CREATE TABLE "BotMcpConnection" (
	"botId" uuid NOT NULL,
	"mcpServerId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"role" "MessageRole" DEFAULT 'USER',
	"parts" json NOT NULL,
	"status" "MessageStatus" DEFAULT 'DONE',
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ChatSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "SessionType" DEFAULT 'DIRECT',
	"title" text,
	"isArchived" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "Comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"postId" uuid NOT NULL,
	"authorId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "FeedPost" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"text" text,
	"authorId" uuid NOT NULL,
	"likeCount" integer DEFAULT 0,
	"context" text DEFAULT '随笔',
	"publishedLabel" text DEFAULT '刚刚',
	"embedding" vector(1536),
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "LlmProvider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"baseUrl" text,
	"apiKey" text,
	"modelId" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
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
CREATE TABLE "PostAttachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postId" uuid NOT NULL,
	"type" "AttachmentType" NOT NULL,
	"url" text,
	"content" text,
	"meta" json,
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "SessionParticipant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" "ParticipantRole" DEFAULT 'MEMBER',
	"joinedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "SocialAffinity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sourceId" text NOT NULL,
	"targetId" text NOT NULL,
	"score" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "SystemConfig" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"isInitialized" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "UserType" DEFAULT 'HUMAN',
	"username" text NOT NULL,
	"nickname" text NOT NULL,
	"avatar" text,
	"bio" text,
	"role" text,
	"catchphrase" text,
	"mbtiTraits" json,
	"currentMood" text DEFAULT '平静',
	"createdById" uuid,
	"passwordHash" text,
	"apiSecret" text,
	"llmProviderId" uuid,
	"webhookUrl" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "User_username_unique" UNIQUE("username"),
	CONSTRAINT "User_apiSecret_unique" UNIQUE("apiSecret")
);
--> statement-breakpoint
CREATE TABLE "WorkflowTrigger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflowId" uuid NOT NULL,
	"type" "TriggerType" NOT NULL,
	"config" json
);
--> statement-breakpoint
CREATE TABLE "Workflow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ownerId" uuid NOT NULL,
	"nodes" json NOT NULL,
	"edges" json NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
