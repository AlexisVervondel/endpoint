# Visitor Register — Design Spec

**Date:** 2026-05-07  
**Project:** clue-register  
**Status:** Approved

---

## Overview

A touch-optimised, self-service visitor registration web application for CluePoints. Deployed on a tablet in the reception area. Visitors sign themselves in and out. A receptionist admin panel provides an overview and manual sign-out capability. Visitors who remain signed in after 4 hours receive an automatic email reminder.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Express 5 + TypeScript |
| Database | SQLite via `better-sqlite3` |
| Directory | Microsoft Graph API (employee list) |
| Email | Microsoft Graph API (send mail) |
| Auth | Azure AD App Registration — client credentials flow |
| Hosting | Azure App Service (Linux, Node 22) |
| Build | Single repo, `concurrently` runs Vite + Express in dev |

---

## Screens

### Kiosk (tablet, touch-first)

**1. Welcome screen**  
Full-screen CluePoints-branded landing page. Two large touch buttons: **Sign In** and **Sign Out**. All kiosk screens auto-reset to Welcome after 30 seconds of inactivity or after a confirmed action.

**2. Sign In form**  
Sequential fields on a single scrollable page, all required:
- First name
- Last name
- Email address
- Phone number
- Reason for visit (dropdown): `Meeting` · `Delivery` · `Interview` · `Training` · `Other`
- Person to meet (dropdown, appears only when reason = `Meeting`): populated from Microsoft Graph API, cached 5 minutes

Large **Register** CTA. On submit: inserts a visit record, shows confirmation screen.

**3. Sign In confirmation**  
Displays visitor's first name, sign-in time, and a success checkmark. Auto-returns to Welcome after 10 seconds.

**4. Sign Out screen**  
Search field (name or email). Displays matching active visits. Visitor taps their record and confirms. Updates `signed_out_at`, returns to Welcome.

### Admin Panel (receptionist, any browser)

No authentication — internal network access only.

- Stats bar: currently inside / total today / reminders sent
- Filterable table: search by name/email, toggle active-only, date picker (defaults to today)
- Per-row columns: Name, Email, Reason, Person to meet, Sign-in time, Sign-out time, Status, Action
- Status indicators: **green** = currently inside, **amber** = inside 4+ hours (reminder sent), **grey** = signed out
- "Sign out" button per active row — sets `signed_out_at` to now

---

## Data Model

Single table: `visits`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY, autoincrement |
| `first_name` | TEXT | NOT NULL |
| `last_name` | TEXT | NOT NULL |
| `email` | TEXT | NOT NULL |
| `phone` | TEXT | NOT NULL |
| `reason` | TEXT | NOT NULL — enum enforced in app |
| `person_to_meet` | TEXT | nullable |
| `signed_in_at` | TEXT | NOT NULL — `YYYY-MM-DD HH:MM:SS` UTC (SQLite datetime-compatible) |
| `signed_out_at` | TEXT | nullable — same format as `signed_in_at` |
| `reminder_sent` | INTEGER | NOT NULL DEFAULT 0 (boolean) |

---

## Microsoft Graph API Integration

**Azure AD App Registration** with two API permissions (application, no user consent):
- `User.Read.All` — list all employees for the "Person to meet" dropdown
- `Mail.Send` — send reminder emails on behalf of a service account

**Employee list endpoint:**  
`GET /v1.0/users?$select=displayName,mail&$top=999`  
Results cached in memory for 5 minutes. Refreshed on cache expiry or on-demand.

**Email sending:**  
`POST /v1.0/users/{SERVICE_ACCOUNT}/sendMail`  
Sends from a dedicated service account mailbox (configured via env var).

---

## 4-Hour Reminder

A `setInterval` job runs every 15 minutes on the Express server.

Query: `SELECT * FROM visits WHERE signed_out_at IS NULL AND reminder_sent = 0 AND signed_in_at <= datetime('now', '-4 hours')`

For each matching visit:
1. Sends a friendly reminder email to the visitor's email address via Graph API
2. Sets `reminder_sent = 1`

Email subject: `Reminder: please sign out at CluePoints reception`  
Email body: personalised with visitor name and sign-in time.

---

## Project Structure

```
clue-register/
├── src/
│   ├── components/         # React components
│   │   ├── kiosk/          # Welcome, SignIn, Confirmation, SignOut screens
│   │   └── admin/          # Admin panel and table
│   ├── App.tsx             # Router: /kiosk and /admin routes
│   ├── main.tsx
│   └── index.css
├── server/
│   ├── index.ts            # Express entry point
│   ├── db.ts               # SQLite setup and queries
│   ├── graph.ts            # Graph API client (employee list + send mail)
│   ├── reminder.ts         # 4-hour reminder job
│   └── routes/
│       ├── visits.ts       # POST /visits, PATCH /visits/:id/signout, GET /visits
│       └── employees.ts    # GET /employees (proxies Graph API with cache)
├── server.ts               # Entry point (imports server/index.ts)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/visits` | Create a new visit (sign in) |
| `PATCH` | `/api/visits/:id/signout` | Sign out a visit |
| `GET` | `/api/visits` | List visits (supports `?date=` and `?active=true` filters) |
| `GET` | `/api/employees` | List M365 employees (cached) |

---

## Environment Variables

```
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
GRAPH_SERVICE_ACCOUNT=          # e.g. noreply@cluepoints.com
PORT=3000
```

---

## Branding

- Primary colour: CluePoints purple (`#7c3aed`)
- Background: dark navy (`#0f172a` / `#1a1a2e`)
- Touch targets: minimum 48px height, 16px gap between interactive elements
- Font: system-ui stack
- CluePoints logo displayed on Welcome screen and admin header

---

## Out of Scope

- Visitor badge printing
- Multi-location support
- GDPR data retention policy / automatic purge (can be added later)
- Visitor photo capture
- SMS notifications
