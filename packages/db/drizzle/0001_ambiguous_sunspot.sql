CREATE TYPE "public"."portal_media_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "portal_media_type" DEFAULT 'image' NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "portal_publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_media" ADD CONSTRAINT "portal_media_project_id_portal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portal_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_media_project_id_idx" ON "portal_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_media_sort_order_idx" ON "portal_media" USING btree ("sort_order");