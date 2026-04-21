-- Migration: Initial incidents schema
-- ISO27001 A.16 - Incident Management

CREATE TYPE "public"."incident_severity" AS ENUM('SEV1', 'SEV2', 'SEV3', 'SEV4');
CREATE TYPE "public"."incident_status" AS ENUM('open', 'investigating', 'mitigated', 'resolved', 'closed');
CREATE TYPE "public"."timeline_event_type" AS ENUM('comment', 'status_change', 'severity_change', 'escalation', 'system');

CREATE TABLE "incidents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "severity" "incident_severity" NOT NULL,
  "status" "incident_status" NOT NULL DEFAULT 'open',
  "commander_id" varchar(255) NOT NULL,
  "affected_systems" jsonb NOT NULL DEFAULT '[]',
  "sla_breach" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "acknowledged_at" timestamp with time zone,
  "mitigated_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "closed_at" timestamp with time zone
);

CREATE TABLE "incident_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
  "author_id" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "event_type" "timeline_event_type" NOT NULL DEFAULT 'comment',
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "postmortems" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL UNIQUE REFERENCES "incidents"("id") ON DELETE CASCADE,
  "author_id" varchar(255) NOT NULL,
  "summary" text NOT NULL,
  "timeline" text NOT NULL,
  "root_cause" text NOT NULL,
  "contributing_factors" text NOT NULL,
  "impact_summary" text NOT NULL,
  "affected_users_count" integer,
  "data_exposed" boolean NOT NULL DEFAULT false,
  "mitigation_steps" text NOT NULL,
  "resolution_steps" text NOT NULL,
  "action_items" jsonb NOT NULL DEFAULT '[]',
  "lessons_learned" text NOT NULL,
  "evidence_collected" text NOT NULL,
  "notifications_sent" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "published_at" timestamp with time zone
);

-- ISO27001 A.12.4.1 - Event logging / audit trail (immutable, no updates/deletes)
CREATE TABLE "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" varchar(255) NOT NULL,
  "action" varchar(100) NOT NULL,
  "resource_type" varchar(50) NOT NULL,
  "resource_id" uuid NOT NULL,
  "before" jsonb,
  "after" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER postmortems_updated_at
  BEFORE UPDATE ON postmortems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX idx_incident_timeline_incident_id ON incident_timeline(incident_id, created_at ASC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
