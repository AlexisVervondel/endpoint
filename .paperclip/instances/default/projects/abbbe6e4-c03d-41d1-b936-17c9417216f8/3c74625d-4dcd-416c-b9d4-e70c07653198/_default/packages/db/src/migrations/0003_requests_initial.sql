-- IT Request System initial schema
-- NIS2 / ISO27001 A.12.1.2 — service continuity request tracking

CREATE TYPE "request_category" AS ENUM('hardware', 'software_license', 'access', 'infra');
CREATE TYPE "request_status" AS ENUM('pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "request_priority" AS ENUM('low', 'medium', 'high', 'urgent');

CREATE TABLE "it_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "category" "request_category" NOT NULL,
  "priority" "request_priority" DEFAULT 'medium' NOT NULL,
  "status" "request_status" DEFAULT 'pending' NOT NULL,
  "requester_id" varchar(255) NOT NULL,
  "requester_email" varchar(255) NOT NULL,
  "assignee_id" varchar(255),
  "manager_id" varchar(255),
  "approved_at" timestamp with time zone,
  "approved_by" varchar(255),
  "rejected_at" timestamp with time zone,
  "rejected_by" varchar(255),
  "rejection_reason" text,
  "completed_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone NOT NULL,
  "sla_breach" boolean DEFAULT false NOT NULL,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "it_requests_status_idx" ON "it_requests" ("status");
CREATE INDEX "it_requests_category_idx" ON "it_requests" ("category");
CREATE INDEX "it_requests_requester_idx" ON "it_requests" ("requester_id");
CREATE INDEX "it_requests_created_at_idx" ON "it_requests" ("created_at");

CREATE TABLE "request_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" uuid NOT NULL REFERENCES "it_requests"("id") ON DELETE CASCADE,
  "author_id" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "is_internal" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "request_comments_request_id_idx" ON "request_comments" ("request_id");
