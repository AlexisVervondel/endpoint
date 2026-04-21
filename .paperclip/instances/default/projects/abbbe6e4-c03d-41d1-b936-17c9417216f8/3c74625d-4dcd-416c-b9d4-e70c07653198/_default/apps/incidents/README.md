# Incident Tracker — Backend API

Fastify + PostgreSQL API for the ITS Incident Tracker.

## Features

- Open/close/escalate incidents with SEV1–SEV4 severity classification
- Timestamped status transitions (acknowledged, mitigated, resolved, closed)
- Chronological timeline entries per incident
- Postmortem/RCA with ISO27001-required fields
- Slack webhook notifications on open/close/escalation
- SLA tracking and MTTR reporting
- Full audit log (ISO27001 A.12.4.1)

## ISO27001 Controls

| Control | Implementation |
|---|---|
| A.16.1.1 Responsibilities | Commander field, status transitions |
| A.16.1.2 Reporting | POST /api/incidents |
| A.16.1.4 Assessment | Severity classification SEV1–SEV4 |
| A.16.1.5 Response | Status workflow + Slack alerts |
| A.16.1.6 Learning | Postmortem with lessons learned |
| A.16.1.7 Evidence | evidenceCollected field + audit_log table |
| A.12.4.1 Audit logging | audit_log table, immutable entries |

## Routes

```
GET  /health
GET  /api/incidents              ?status=&severity=&limit=&offset=
GET  /api/incidents/:id
POST /api/incidents
PATCH /api/incidents/:id

GET  /api/incidents/:id/timeline
POST /api/incidents/:id/timeline

GET  /api/incidents/:id/postmortem
POST /api/incidents/:id/postmortem
PATCH /api/incidents/:id/postmortem

GET  /api/reports/mttr           ?periodStart=&periodEnd=
GET  /api/reports/sla            ?periodStart=&periodEnd=
```

## SLA Thresholds

| Severity | Threshold |
|---|---|
| SEV1 | 1 hour |
| SEV2 | 4 hours |
| SEV3 | 24 hours |
| SEV4 | 72 hours |

## Setup

```bash
cp ../../.env.example ../../.env
# Edit DATABASE_URL and optional SLACK_WEBHOOK_URL

cd ../../
pnpm install
pnpm --filter @its/db db:migrate
pnpm --filter @its/incidents dev
```
