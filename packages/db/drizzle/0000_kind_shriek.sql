CREATE TYPE "public"."portal_admin_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."portal_highlight_category" AS ENUM('performance', 'architecture', 'i18n', 'ai', 'feature', 'fix');--> statement-breakpoint
CREATE TYPE "public"."portal_platform" AS ENUM('xiaohongshu', 'wechat_mp', 'douyin');--> statement-breakpoint
CREATE TYPE "public"."portal_project_form" AS ENUM('wechat_mp', 'fullstack', 'website', 'other');--> statement-breakpoint
CREATE TYPE "public"."portal_publish_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"role" "portal_admin_role" DEFAULT 'editor' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"detail" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "portal_publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"metric_label" text,
	"metric_value" text,
	"body" text,
	"category" "portal_highlight_category" DEFAULT 'feature' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "portal_publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"display_name_en" text,
	"tagline" text,
	"form" "portal_project_form" DEFAULT 'other' NOT NULL,
	"description" text,
	"description_en" text,
	"icon_url" text,
	"cover_url" text,
	"repo_url" text,
	"homepage_url" text,
	"tech_stack" text[],
	"status" "portal_publish_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"current_version" text,
	"released_at" timestamp with time zone,
	"source_path" text,
	"raw_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_projects_slug_unique" UNIQUE("slug"),
	CONSTRAINT "portal_projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_publish_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"release_id" uuid,
	"platform" "portal_platform" NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"tags" text[],
	"cover_url" text,
	"deeplink" text,
	"status" "portal_publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"generation_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" text NOT NULL,
	"title" text,
	"date" timestamp with time zone,
	"body" text NOT NULL,
	"source_file" text,
	"is_major" boolean DEFAULT false,
	"status" "portal_publish_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_features" ADD CONSTRAINT "portal_features_project_id_portal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portal_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_highlights" ADD CONSTRAINT "portal_highlights_project_id_portal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portal_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_publish_drafts" ADD CONSTRAINT "portal_publish_drafts_project_id_portal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portal_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_publish_drafts" ADD CONSTRAINT "portal_publish_drafts_release_id_portal_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."portal_releases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_releases" ADD CONSTRAINT "portal_releases_project_id_portal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portal_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
