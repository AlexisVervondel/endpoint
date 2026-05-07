# Visitor Register — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a touch-optimised visitor registration kiosk + receptionist admin panel for CluePoints, with Microsoft Graph API for employee lookup and 4-hour email reminders.

**Architecture:** Single-repo React + Express app. Vite dev server proxies `/api` to Express on port 3000. In production, Express serves both the compiled frontend (static files from `dist/`) and the API. SQLite stores visit records. Microsoft Graph API (client credentials flow) handles the employee list and outbound reminder emails. The server runs with `tsx` in both dev and production — no separate compile step for the backend.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Express 5, better-sqlite3, @azure/identity, react-router-dom v7, vitest, supertest, tsx, concurrently.

---

## File Map

```
clue-register/
├── src/
│   ├── components/
│   │   ├── kiosk/
│   │   │   ├── Welcome.tsx       # Welcome screen: Sign In / Sign Out buttons
│   │   │   ├── SignInForm.tsx    # Registration form with M365 employee dropdown
│   │   │   ├── Confirmation.tsx  # Post-registration success screen
│   │   │   └── SignOut.tsx       # Search + confirm sign-out screen
│   │   └── admin/
│   │       └── AdminPanel.tsx    # Receptionist view: stats + filterable table
│   ├── hooks/
│   │   └── useInactivityReset.ts # 30s inactivity → navigate to Welcome
│   ├── types.ts                  # Shared frontend types (Visit, Employee, VisitReason)
│   ├── App.tsx                   # React Router: /kiosk/* and /admin routes
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind import + brand CSS variables
├── server/
│   ├── types.ts                  # Server-side types (Visit, Employee, CreateVisitInput)
│   ├── db.ts                     # SQLite: createDb() factory + query functions
│   ├── graph.ts                  # Graph API: token, listEmployees, sendReminderEmail
│   ├── reminder.ts               # 4-hour reminder job (setInterval)
│   ├── index.ts                  # Express app factory: createApp(db, graph)
│   └── routes/
│       ├── visits.ts             # Router factory: createVisitRouter(db)
│       └── employees.ts          # Router factory: createEmployeeRouter(graph)
├── tests/
│   ├── db.test.ts
│   ├── graph.test.ts
│   ├── reminder.test.ts
│   └── routes/
│       ├── visits.test.ts
│       └── employees.test.ts
├── server.ts                     # Entry point: imports createApp, calls listen()
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── .env.example
├── .gitignore
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "clue-register",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"tsx watch server.ts\" \"vite\"",
    "build": "vite build",
    "start": "tsx server.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@azure/identity": "^4.10.0",
    "better-sqlite3": "^11.9.1",
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-router-dom": "^7.6.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.4",
    "@types/better-sqlite3": "^7.6.13",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^22.0.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/supertest": "^6.0.3",
    "@vitejs/plugin-react": "^6.0.1",
    "concurrently": "^9.2.1",
    "supertest": "^7.1.0",
    "tailwindcss": "^4.2.4",
    "tsx": "^4.19.3",
    "typescript": "~6.0.2",
    "vite": "^8.0.9",
    "vitest": "^4.1.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 3: Create `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["server", "server.ts", "tests"]
}
```

- [ ] **Step 5: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 6: Create `.env.example`**

```
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
GRAPH_SERVICE_ACCOUNT=noreply@cluepoints.com
DB_PATH=./visitors.db
PORT=3000
NODE_ENV=development
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
.env
*.db
.superpowers/
```

- [ ] **Step 8: Create `src/index.css`**

```css
@import "tailwindcss";

:root {
  --brand-primary: #7c3aed;
  --brand-primary-light: #a78bfa;
  --brand-bg: #0f172a;
  --brand-surface: #1e293b;
  --brand-surface-dark: #1a1a2e;
  --brand-border: #334155;
  --brand-text: #e2e8f0;
  --brand-muted: #94a3b8;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--brand-bg);
  color: var(--brand-text);
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

#root {
  min-height: 100vh;
}
```

- [ ] **Step 9: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 10: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts .env.example .gitignore src/main.tsx src/index.css
git commit -m "chore: scaffold project — deps, tsconfig, vite, css vars"
```

---

## Task 2: Server Types

**Files:**
- Create: `server/types.ts`

- [ ] **Step 1: Create `server/types.ts`**

```typescript
export type VisitReason = 'Meeting' | 'Delivery' | 'Interview' | 'Training' | 'Other';

export const VISIT_REASONS: VisitReason[] = ['Meeting', 'Delivery', 'Interview', 'Training', 'Other'];

export interface Visit {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reason: VisitReason;
  person_to_meet: string | null;
  signed_in_at: string;   // 'YYYY-MM-DD HH:MM:SS' UTC
  signed_out_at: string | null;
  reminder_sent: number;  // 0 | 1
}

export interface CreateVisitInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reason: VisitReason;
  person_to_meet?: string;
}

export interface Employee {
  displayName: string;
  mail: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/types.ts
git commit -m "feat(server): add shared types"
```

---

## Task 3: Database Layer

**Files:**
- Create: `server/db.ts`
- Create: `tests/db.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '../server/db.ts';
import type { CreateVisitInput } from '../server/types.ts';

const input: CreateVisitInput = {
  first_name: 'Sarah',
  last_name: 'Martin',
  email: 'sarah@example.com',
  phone: '+32470000000',
  reason: 'Meeting',
  person_to_meet: 'John Doe',
};

describe('createDb', () => {
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  it('createVisit inserts a record and returns it with id', () => {
    const visit = db.createVisit(input);
    expect(visit.id).toBeTypeOf('number');
    expect(visit.first_name).toBe('Sarah');
    expect(visit.signed_out_at).toBeNull();
    expect(visit.reminder_sent).toBe(0);
  });

  it('createVisit stores signed_in_at in YYYY-MM-DD HH:MM:SS format', () => {
    const visit = db.createVisit(input);
    expect(visit.signed_in_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('signOutVisit sets signed_out_at and returns the updated visit', () => {
    const created = db.createVisit(input);
    const updated = db.signOutVisit(created.id);
    expect(updated).not.toBeNull();
    expect(updated!.signed_out_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('signOutVisit returns null for unknown id', () => {
    expect(db.signOutVisit(999)).toBeNull();
  });

  it('getVisits returns all visits for a given date', () => {
    db.createVisit(input);
    db.createVisit({ ...input, email: 'other@example.com' });
    const today = new Date().toISOString().slice(0, 10);
    const visits = db.getVisits({ date: today });
    expect(visits).toHaveLength(2);
  });

  it('getVisits with active=true returns only unsigned-out visits', () => {
    const v1 = db.createVisit(input);
    db.createVisit({ ...input, email: 'other@example.com' });
    db.signOutVisit(v1.id);
    const active = db.getVisits({ active: true });
    expect(active).toHaveLength(1);
    expect(active[0].email).toBe('other@example.com');
  });

  it('getOverdueVisits returns visits signed in >4h ago with no sign-out and reminder not sent', () => {
    db.createVisit(input);
    const overdue = db.getOverdueVisits();
    // New visit was just created, not overdue
    expect(overdue).toHaveLength(0);
  });

  it('markReminderSent sets reminder_sent=1', () => {
    const visit = db.createVisit(input);
    db.markReminderSent(visit.id);
    const today = new Date().toISOString().slice(0, 10);
    const [updated] = db.getVisits({ date: today });
    expect(updated.reminder_sent).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/db.test.ts
```

Expected: FAIL — `Cannot find module '../server/db.ts'`

- [ ] **Step 3: Create `server/db.ts`**

```typescript
import Database from 'better-sqlite3';
import type { Visit, CreateVisitInput } from './types.ts';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS visits (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT NOT NULL,
    reason        TEXT NOT NULL,
    person_to_meet TEXT,
    signed_in_at  TEXT NOT NULL,
    signed_out_at TEXT,
    reminder_sent INTEGER NOT NULL DEFAULT 0
  )
`;

function nowUtc(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function createDb(path: string) {
  const db = new Database(path);
  db.exec(CREATE_TABLE);

  return {
    createVisit(input: CreateVisitInput): Visit {
      const stmt = db.prepare(`
        INSERT INTO visits (first_name, last_name, email, phone, reason, person_to_meet, signed_in_at)
        VALUES (@first_name, @last_name, @email, @phone, @reason, @person_to_meet, @signed_in_at)
      `);
      const signed_in_at = nowUtc();
      const result = stmt.run({ ...input, person_to_meet: input.person_to_meet ?? null, signed_in_at });
      return db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid) as Visit;
    },

    signOutVisit(id: number): Visit | null {
      const signed_out_at = nowUtc();
      const info = db.prepare(
        'UPDATE visits SET signed_out_at = ? WHERE id = ? AND signed_out_at IS NULL'
      ).run(signed_out_at, id);
      if (info.changes === 0) return null;
      return db.prepare('SELECT * FROM visits WHERE id = ?').get(id) as Visit;
    },

    getVisits({ date, active }: { date?: string; active?: boolean } = {}): Visit[] {
      let query = 'SELECT * FROM visits WHERE 1=1';
      const params: (string | number)[] = [];
      if (date) {
        query += ' AND DATE(signed_in_at) = ?';
        params.push(date);
      }
      if (active) {
        query += ' AND signed_out_at IS NULL';
      }
      query += ' ORDER BY signed_in_at DESC';
      return db.prepare(query).all(...params) as Visit[];
    },

    getOverdueVisits(): Visit[] {
      return db.prepare(`
        SELECT * FROM visits
        WHERE signed_out_at IS NULL
          AND reminder_sent = 0
          AND signed_in_at <= datetime('now', '-4 hours')
      `).all() as Visit[];
    },

    markReminderSent(id: number): void {
      db.prepare('UPDATE visits SET reminder_sent = 1 WHERE id = ?').run(id);
    },
  };
}

export type Db = ReturnType<typeof createDb>;

export const db = createDb(process.env.DB_PATH ?? 'visitors.db');
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/db.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/db.ts tests/db.test.ts
git commit -m "feat(server): database layer with SQLite — createDb, visit queries"
```

---

## Task 4: Graph API Client

**Files:**
- Create: `server/graph.ts`
- Create: `tests/graph.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/graph.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @azure/identity before importing graph
vi.mock('@azure/identity', () => ({
  ClientSecretCredential: vi.fn().mockImplementation(() => ({
    getToken: vi.fn().mockResolvedValue({ token: 'mock-token' }),
  })),
}));

// Set required env vars before importing
process.env.AZURE_TENANT_ID = 'test-tenant';
process.env.AZURE_CLIENT_ID = 'test-client';
process.env.AZURE_CLIENT_SECRET = 'test-secret';
process.env.GRAPH_SERVICE_ACCOUNT = 'noreply@cluepoints.com';

import { createGraphClient } from '../server/graph.ts';
import type { Visit } from '../server/types.ts';

const mockVisit: Visit = {
  id: 1,
  first_name: 'Sarah',
  last_name: 'Martin',
  email: 'sarah@example.com',
  phone: '+32470000000',
  reason: 'Meeting',
  person_to_meet: 'John Doe',
  signed_in_at: '2026-05-07 09:00:00',
  signed_out_at: null,
  reminder_sent: 0,
};

describe('createGraphClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listEmployees fetches from Graph API and returns employees', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: [
          { displayName: 'John Doe', mail: 'john@cluepoints.com' },
          { displayName: 'Jane Smith', mail: 'jane@cluepoints.com' },
        ],
      }),
    } as Response);

    const client = createGraphClient();
    const employees = await client.listEmployees();

    expect(employees).toHaveLength(2);
    expect(employees[0].displayName).toBe('John Doe');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/v1.0/users'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }) })
    );
  });

  it('listEmployees returns cached result within TTL without re-fetching', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ value: [{ displayName: 'John Doe', mail: 'john@cluepoints.com' }] }),
    } as Response);

    const client = createGraphClient();
    await client.listEmployees();
    await client.listEmployees();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('sendReminderEmail posts to Graph sendMail endpoint', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response);

    const client = createGraphClient();
    await client.sendReminderEmail(mockVisit);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/sendMail'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sendReminderEmail throws when Graph API returns an error', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as Response);

    const client = createGraphClient();
    await expect(client.sendReminderEmail(mockVisit)).rejects.toThrow('Graph sendMail failed: 403');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/graph.test.ts
```

Expected: FAIL — `Cannot find module '../server/graph.ts'`

- [ ] **Step 3: Create `server/graph.ts`**

```typescript
import { ClientSecretCredential } from '@azure/identity';
import type { Employee, Visit } from './types.ts';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface GraphClient {
  listEmployees(): Promise<Employee[]>;
  sendReminderEmail(visit: Visit): Promise<void>;
}

export function createGraphClient(): GraphClient {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!,
  );

  let cache: Employee[] | null = null;
  let cacheTime = 0;

  async function getToken(): Promise<string> {
    const token = await credential.getToken('https://graph.microsoft.com/.default');
    return token.token;
  }

  async function listEmployees(): Promise<Employee[]> {
    if (cache && Date.now() - cacheTime < CACHE_TTL_MS) return cache;

    const token = await getToken();
    const res = await fetch(
      `${GRAPH_BASE}/users?$select=displayName,mail&$top=999&$filter=accountEnabled eq true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) throw new Error(`Graph listUsers failed: ${res.status}`);
    const data = await res.json() as { value: Employee[] };
    cache = data.value.filter(e => e.mail);
    cacheTime = Date.now();
    return cache;
  }

  async function sendReminderEmail(visit: Visit): Promise<void> {
    const token = await getToken();
    const serviceAccount = process.env.GRAPH_SERVICE_ACCOUNT!;
    const signedInAt = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z')
      .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });

    const body = {
      message: {
        subject: 'Reminder: please sign out at CluePoints reception',
        body: {
          contentType: 'HTML',
          content: `
            <p>Dear ${visit.first_name},</p>
            <p>Our records show you signed in at CluePoints reception at <strong>${signedInAt}</strong> and have not yet signed out.</p>
            <p>Please return to the reception tablet to sign out when you leave.</p>
            <p>Thank you,<br/>CluePoints Reception</p>
          `,
        },
        toRecipients: [{ emailAddress: { address: visit.email } }],
      },
    };

    const res = await fetch(`${GRAPH_BASE}/users/${serviceAccount}/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Graph sendMail failed: ${res.status}`);
  }

  return { listEmployees, sendReminderEmail };
}

export const graphClient: GraphClient = createGraphClient();
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/graph.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/graph.ts tests/graph.test.ts
git commit -m "feat(server): Graph API client — employee list with cache, reminder email"
```

---

## Task 5: Visits API Route

**Files:**
- Create: `server/routes/visits.ts`
- Create: `tests/routes/visits.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/routes/visits.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createDb } from '../../server/db.ts';
import { createVisitRouter } from '../../server/routes/visits.ts';

function buildApp() {
  const db = createDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/', createVisitRouter(db));
  return { app, db };
}

describe('POST /api/visits', () => {
  it('creates a visit and returns 201 with the visit record', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/').send({
      first_name: 'Sarah',
      last_name: 'Martin',
      email: 'sarah@example.com',
      phone: '+32470000000',
      reason: 'Meeting',
      person_to_meet: 'John Doe',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.first_name).toBe('Sarah');
    expect(res.body.signed_out_at).toBeNull();
  });

  it('returns 400 when required fields are missing', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/').send({ first_name: 'Sarah' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf('string');
  });

  it('returns 400 when reason is not a valid enum value', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/').send({
      first_name: 'Sarah',
      last_name: 'Martin',
      email: 'sarah@example.com',
      phone: '+32470000000',
      reason: 'InvalidReason',
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/visits/:id/signout', () => {
  it('signs out an active visit and returns the updated record', async () => {
    const { app, db } = buildApp();
    const visit = db.createVisit({
      first_name: 'Sarah', last_name: 'Martin', email: 'sarah@example.com',
      phone: '+32470000000', reason: 'Delivery',
    });

    const res = await request(app).patch(`/${visit.id}/signout`);
    expect(res.status).toBe(200);
    expect(res.body.signed_out_at).not.toBeNull();
  });

  it('returns 404 when visit not found or already signed out', async () => {
    const { app } = buildApp();
    const res = await request(app).patch('/999/signout');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/visits', () => {
  it('returns all visits for today by default', async () => {
    const { app, db } = buildApp();
    db.createVisit({ first_name: 'A', last_name: 'B', email: 'a@b.com', phone: '0', reason: 'Delivery' });
    db.createVisit({ first_name: 'C', last_name: 'D', email: 'c@d.com', phone: '0', reason: 'Delivery' });

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app).get(`/?date=${today}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters active-only visits', async () => {
    const { app, db } = buildApp();
    const v1 = db.createVisit({ first_name: 'A', last_name: 'B', email: 'a@b.com', phone: '0', reason: 'Delivery' });
    db.createVisit({ first_name: 'C', last_name: 'D', email: 'c@d.com', phone: '0', reason: 'Delivery' });
    db.signOutVisit(v1.id);

    const res = await request(app).get('/?active=true');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe('c@d.com');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/routes/visits.test.ts
```

Expected: FAIL — `Cannot find module '../../server/routes/visits.ts'`

- [ ] **Step 3: Create `server/routes/visits.ts`**

```typescript
import { Router } from 'express';
import type { Db } from '../db.ts';
import { VISIT_REASONS } from '../types.ts';
import type { CreateVisitInput } from '../types.ts';

export function createVisitRouter(db: Db): Router {
  const router = Router();

  router.post('/', (req, res) => {
    const { first_name, last_name, email, phone, reason, person_to_meet } = req.body as Partial<CreateVisitInput>;

    if (!first_name || !last_name || !email || !phone || !reason) {
      res.status(400).json({ error: 'Missing required fields: first_name, last_name, email, phone, reason' });
      return;
    }
    if (!(VISIT_REASONS as readonly string[]).includes(reason)) {
      res.status(400).json({ error: `reason must be one of: ${VISIT_REASONS.join(', ')}` });
      return;
    }

    const visit = db.createVisit({ first_name, last_name, email, phone, reason, person_to_meet });
    res.status(201).json(visit);
  });

  router.patch('/:id/signout', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const visit = db.signOutVisit(id);
    if (!visit) {
      res.status(404).json({ error: 'Visit not found or already signed out' });
      return;
    }
    res.json(visit);
  });

  router.get('/', (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const active = req.query.active === 'true';
    res.json(db.getVisits({ date, active }));
  });

  return router;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/routes/visits.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/visits.ts tests/routes/visits.test.ts
git commit -m "feat(server): visits API route — POST, PATCH signout, GET with filters"
```

---

## Task 6: Employees API Route

**Files:**
- Create: `server/routes/employees.ts`
- Create: `tests/routes/employees.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/routes/employees.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createEmployeeRouter } from '../../server/routes/employees.ts';
import type { GraphClient } from '../../server/graph.ts';

function buildApp(graph: Partial<GraphClient>) {
  const app = express();
  app.use(express.json());
  app.use('/', createEmployeeRouter(graph as GraphClient));
  return app;
}

describe('GET /api/employees', () => {
  it('returns the employee list from the graph client', async () => {
    const mockGraph: Partial<GraphClient> = {
      listEmployees: vi.fn().mockResolvedValue([
        { displayName: 'John Doe', mail: 'john@cluepoints.com' },
        { displayName: 'Jane Smith', mail: 'jane@cluepoints.com' },
      ]),
    };
    const app = buildApp(mockGraph);

    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].displayName).toBe('John Doe');
  });

  it('returns 500 when the graph client throws', async () => {
    const mockGraph: Partial<GraphClient> = {
      listEmployees: vi.fn().mockRejectedValue(new Error('Graph API unavailable')),
    };
    const app = buildApp(mockGraph);

    const res = await request(app).get('/');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeTypeOf('string');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/routes/employees.test.ts
```

Expected: FAIL — `Cannot find module '../../server/routes/employees.ts'`

- [ ] **Step 3: Create `server/routes/employees.ts`**

```typescript
import { Router } from 'express';
import type { GraphClient } from '../graph.ts';

export function createEmployeeRouter(graph: GraphClient): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const employees = await graph.listEmployees();
      res.json(employees);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: `Failed to fetch employees: ${message}` });
    }
  });

  return router;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/routes/employees.test.ts
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/employees.ts tests/routes/employees.test.ts
git commit -m "feat(server): employees API route — GET proxies M365 Graph with error handling"
```

---

## Task 7: Reminder Job

**Files:**
- Create: `server/reminder.ts`
- Create: `tests/reminder.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/reminder.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Db } from '../server/db.ts';
import type { GraphClient } from '../server/graph.ts';
import type { Visit } from '../server/types.ts';

const overdueVisit: Visit = {
  id: 1,
  first_name: 'Sarah',
  last_name: 'Martin',
  email: 'sarah@example.com',
  phone: '+32470000000',
  reason: 'Meeting',
  person_to_meet: 'John Doe',
  signed_in_at: '2026-05-07 05:00:00',
  signed_out_at: null,
  reminder_sent: 0,
};

describe('runReminderCheck', () => {
  let mockDb: Partial<Db>;
  let mockGraph: Partial<GraphClient>;

  beforeEach(() => {
    mockDb = {
      getOverdueVisits: vi.fn().mockReturnValue([overdueVisit]),
      markReminderSent: vi.fn(),
    };
    mockGraph = {
      sendReminderEmail: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends a reminder email for each overdue visit', async () => {
    const { runReminderCheck } = await import('../server/reminder.ts');
    await runReminderCheck(mockDb as Db, mockGraph as GraphClient);

    expect(mockGraph.sendReminderEmail).toHaveBeenCalledWith(overdueVisit);
    expect(mockDb.markReminderSent).toHaveBeenCalledWith(1);
  });

  it('does nothing when no overdue visits', async () => {
    mockDb.getOverdueVisits = vi.fn().mockReturnValue([]);
    const { runReminderCheck } = await import('../server/reminder.ts');
    await runReminderCheck(mockDb as Db, mockGraph as GraphClient);

    expect(mockGraph.sendReminderEmail).not.toHaveBeenCalled();
    expect(mockDb.markReminderSent).not.toHaveBeenCalled();
  });

  it('marks reminder sent even if email fails, and continues processing', async () => {
    const secondVisit = { ...overdueVisit, id: 2, email: 'other@example.com' };
    mockDb.getOverdueVisits = vi.fn().mockReturnValue([overdueVisit, secondVisit]);
    mockGraph.sendReminderEmail = vi.fn()
      .mockRejectedValueOnce(new Error('SMTP error'))
      .mockResolvedValueOnce(undefined);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runReminderCheck } = await import('../server/reminder.ts');
    await runReminderCheck(mockDb as Db, mockGraph as GraphClient);

    expect(mockGraph.sendReminderEmail).toHaveBeenCalledTimes(2);
    expect(mockDb.markReminderSent).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/reminder.test.ts
```

Expected: FAIL — `Cannot find module '../server/reminder.ts'`

- [ ] **Step 3: Create `server/reminder.ts`**

```typescript
import type { Db } from './db.ts';
import type { GraphClient } from './graph.ts';

export async function runReminderCheck(db: Db, graph: GraphClient): Promise<void> {
  const overdue = db.getOverdueVisits();
  for (const visit of overdue) {
    try {
      await graph.sendReminderEmail(visit);
      db.markReminderSent(visit.id);
    } catch (err) {
      console.error(`Reminder failed for visit ${visit.id} (${visit.email}):`, err);
    }
  }
}

export function startReminderJob(db: Db, graph: GraphClient): ReturnType<typeof setInterval> {
  const INTERVAL_MS = 15 * 60 * 1000;
  return setInterval(() => {
    runReminderCheck(db, graph).catch(err =>
      console.error('Reminder job error:', err)
    );
  }, INTERVAL_MS);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/reminder.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run all server tests together**

```bash
npx vitest run tests/
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/reminder.ts tests/reminder.test.ts
git commit -m "feat(server): 4-hour reminder job with error isolation per visit"
```

---

## Task 8: Express Server Entry

**Files:**
- Create: `server/index.ts`
- Create: `server.ts`

- [ ] **Step 1: Create `server/index.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Db } from './db.ts';
import type { GraphClient } from './graph.ts';
import { createVisitRouter } from './routes/visits.ts';
import { createEmployeeRouter } from './routes/employees.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(db: Db, graph: GraphClient) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/visits', createVisitRouter(db));
  app.use('/api/employees', createEmployeeRouter(graph));

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}
```

- [ ] **Step 2: Create `server.ts`**

```typescript
import { createApp } from './server/index.ts';
import { db } from './server/db.ts';
import { graphClient } from './server/graph.ts';
import { startReminderJob } from './server/reminder.ts';

const PORT = process.env.PORT ?? 3000;

const app = createApp(db, graphClient);
startReminderJob(db, graphClient);

app.listen(PORT, () => {
  console.log(`Visitor Register server running on http://localhost:${PORT}`);
  console.log(`  Kiosk:  http://localhost:${PORT}/kiosk`);
  console.log(`  Admin:  http://localhost:${PORT}/admin`);
});
```

- [ ] **Step 3: Verify server starts (requires .env file)**

```bash
cp .env.example .env
# Fill in AZURE_* values or leave blank for local dev without email
npx tsx server.ts
```

Expected: `Visitor Register server running on http://localhost:3000`

Stop the server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server/index.ts server.ts .env.example
git commit -m "feat(server): Express app factory + entry point with reminder job"
```

---

## Task 9: Frontend Types and Inactivity Hook

**Files:**
- Create: `src/types.ts`
- Create: `src/hooks/useInactivityReset.ts`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
export type VisitReason = 'Meeting' | 'Delivery' | 'Interview' | 'Training' | 'Other';

export const VISIT_REASONS: VisitReason[] = ['Meeting', 'Delivery', 'Interview', 'Training', 'Other'];

export interface Visit {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reason: VisitReason;
  person_to_meet: string | null;
  signed_in_at: string;
  signed_out_at: string | null;
  reminder_sent: number;
}

export interface Employee {
  displayName: string;
  mail: string;
}

export interface SignInFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reason: VisitReason | '';
  person_to_meet: string;
}
```

- [ ] **Step 2: Create `src/hooks/useInactivityReset.ts`**

```typescript
import { useEffect, useCallback } from 'react';

export function useInactivityReset(timeoutMs: number, onReset: () => void): void {
  const stableReset = useCallback(onReset, [onReset]);

  useEffect(() => {
    let timer = setTimeout(stableReset, timeoutMs);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(stableReset, timeoutMs);
    };

    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [timeoutMs, stableReset]);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/hooks/useInactivityReset.ts
git commit -m "feat(frontend): shared types and inactivity reset hook"
```

---

## Task 10: Kiosk — Welcome Screen

**Files:**
- Create: `src/components/kiosk/Welcome.tsx`

- [ ] **Step 1: Create `src/components/kiosk/Welcome.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useInactivityReset } from '../../hooks/useInactivityReset.ts';

export default function Welcome() {
  const navigate = useNavigate();

  useInactivityReset(30_000, () => {});

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8"
         style={{ background: 'var(--brand-surface-dark)' }}>
      {/* Logo placeholder */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
             style={{ background: 'var(--brand-primary)' }}>
          <span className="text-white font-bold text-2xl">C</span>
        </div>
        <span className="text-white font-semibold text-xl tracking-wide">CluePoints</span>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2 text-center">Welcome</h1>
      <p className="mb-12 text-center" style={{ color: 'var(--brand-muted)' }}>
        Please register your visit below
      </p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <button
          onClick={() => navigate('/kiosk/sign-in')}
          className="w-full py-5 rounded-2xl text-white font-semibold text-xl transition-opacity active:opacity-80"
          style={{ background: 'var(--brand-primary)', minHeight: 72 }}
        >
          Sign In
        </button>

        <button
          onClick={() => navigate('/kiosk/sign-out')}
          className="w-full py-5 rounded-2xl font-semibold text-xl transition-opacity active:opacity-80"
          style={{
            background: 'transparent',
            border: '2px solid var(--brand-primary)',
            color: 'var(--brand-primary-light)',
            minHeight: 72,
          }}
        >
          Sign Out
        </button>
      </div>

      <p className="mt-16 text-xs" style={{ color: '#475569' }}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kiosk/Welcome.tsx
git commit -m "feat(kiosk): Welcome screen with Sign In / Sign Out navigation"
```

---

## Task 11: Kiosk — Sign In Form

**Files:**
- Create: `src/components/kiosk/SignInForm.tsx`

- [ ] **Step 1: Create `src/components/kiosk/SignInForm.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInactivityReset } from '../../hooks/useInactivityReset.ts';
import type { SignInFormData, Employee, Visit } from '../../types.ts';
import { VISIT_REASONS } from '../../types.ts';

const EMPTY_FORM: SignInFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  reason: '',
  person_to_meet: '',
};

interface Props {
  onSignIn: (visit: Visit) => void;
}

export default function SignInForm({ onSignIn }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignInFormData>(EMPTY_FORM);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useInactivityReset(30_000, () => navigate('/kiosk'));

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(setEmployees)
      .catch(() => {});
  }, []);

  function set<K extends keyof SignInFormData>(key: K, value: SignInFormData[K]) {
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'reason' && value !== 'Meeting' ? { person_to_meet: '' } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reason) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          reason: form.reason,
          ...(form.person_to_meet ? { person_to_meet: form.person_to_meet } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Registration failed');
      }
      const visit = await res.json() as Visit;
      onSignIn(visit);
      navigate('/kiosk/confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = [
    'w-full px-4 py-4 rounded-xl text-white text-base outline-none',
    'border border-solid transition-colors',
  ].join(' ');

  const inputStyle = {
    background: 'var(--brand-surface)',
    borderColor: 'var(--brand-border)',
    color: 'var(--brand-text)',
    minHeight: 56,
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8"
         style={{ background: 'var(--brand-surface-dark)' }}>
      <button
        onClick={() => navigate('/kiosk')}
        className="mb-6 self-start text-sm flex items-center gap-1"
        style={{ color: 'var(--brand-primary-light)' }}
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-white mb-1">Register your visit</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--brand-muted)' }}>
        All fields are required
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-4">
          <input
            required
            placeholder="First name"
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
          <input
            required
            placeholder="Last name"
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <input
          required
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          className={inputClass}
          style={inputStyle}
        />

        <input
          required
          type="tel"
          placeholder="Phone number"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          className={inputClass}
          style={inputStyle}
        />

        <select
          required
          value={form.reason}
          onChange={e => set('reason', e.target.value as SignInFormData['reason'])}
          className={inputClass}
          style={{ ...inputStyle, appearance: 'none' }}
        >
          <option value="">Reason for visit…</option>
          {VISIT_REASONS.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {form.reason === 'Meeting' && (
          <select
            required
            value={form.person_to_meet}
            onChange={e => set('person_to_meet', e.target.value)}
            className={inputClass}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            <option value="">Person to meet…</option>
            {employees.map(emp => (
              <option key={emp.mail} value={emp.displayName}>{emp.displayName}</option>
            ))}
          </select>
        )}

        {error && (
          <p className="text-sm px-4 py-3 rounded-xl" style={{ background: '#450a0a', color: '#fca5a5' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-5 rounded-2xl text-white font-semibold text-xl mt-2 transition-opacity disabled:opacity-50"
          style={{ background: 'var(--brand-primary)', minHeight: 72 }}
        >
          {submitting ? 'Registering…' : 'Register →'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kiosk/SignInForm.tsx
git commit -m "feat(kiosk): Sign In form with M365 employee dropdown and validation"
```

---

## Task 12: Kiosk — Confirmation Screen

**Files:**
- Create: `src/components/kiosk/Confirmation.tsx`

- [ ] **Step 1: Create `src/components/kiosk/Confirmation.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Visit } from '../../types.ts';

interface Props {
  visit: Visit | null;
}

export default function Confirmation({ visit }: Props) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!visit) { navigate('/kiosk'); return; }

    const timer = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(timer); navigate('/kiosk'); return 0; }
        return n - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visit, navigate]);

  if (!visit) return null;

  const signedInAt = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z')
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
         style={{ background: 'var(--brand-surface-dark)' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
           style={{ background: '#059669' }}>
        <span className="text-white text-4xl">✓</span>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">
        Welcome, {visit.first_name}!
      </h1>
      <p className="text-base mb-2" style={{ color: 'var(--brand-muted)' }}>
        Your visit has been registered.
      </p>
      <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
        Signed in at {signedInAt}
      </p>

      {visit.person_to_meet && (
        <p className="mt-3 text-sm" style={{ color: 'var(--brand-muted)' }}>
          Meeting: <span className="text-white">{visit.person_to_meet}</span>
        </p>
      )}

      <p className="mt-12 text-sm" style={{ color: '#475569' }}>
        Returning to home in {countdown}s…
      </p>

      <button
        onClick={() => navigate('/kiosk')}
        className="mt-4 px-6 py-3 rounded-xl text-sm font-medium transition-opacity active:opacity-70"
        style={{ color: 'var(--brand-primary-light)', border: '1px solid var(--brand-border)' }}
      >
        Done
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kiosk/Confirmation.tsx
git commit -m "feat(kiosk): Confirmation screen with 10s auto-return"
```

---

## Task 13: Kiosk — Sign Out Screen

**Files:**
- Create: `src/components/kiosk/SignOut.tsx`

- [ ] **Step 1: Create `src/components/kiosk/SignOut.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInactivityReset } from '../../hooks/useInactivityReset.ts';
import type { Visit } from '../../types.ts';

export default function SignOut() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Visit[]>([]);
  const [searched, setSearched] = useState(false);
  const [confirming, setConfirming] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useInactivityReset(30_000, () => navigate('/kiosk'));

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/visits?active=true`);
      const visits = await res.json() as Visit[];
      const q = query.toLowerCase();
      setResults(visits.filter(v =>
        `${v.first_name} ${v.last_name}`.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q)
      ));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSignOut(visit: Visit) {
    setLoading(true);
    try {
      const res = await fetch(`/api/visits/${visit.id}/signout`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Sign out failed');
      setDone(true);
      setTimeout(() => navigate('/kiosk'), 3000);
    } catch {
      alert('Could not sign out. Please ask reception for help.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8"
           style={{ background: 'var(--brand-surface-dark)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
             style={{ background: '#059669' }}>
          <span className="text-white text-4xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Goodbye!</h1>
        <p style={{ color: 'var(--brand-muted)' }}>Your visit has been signed out. Have a safe trip!</p>
      </div>
    );
  }

  if (confirming) {
    const signedInAt = new Date(confirming.signed_in_at.replace(' ', 'T') + 'Z')
      .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8"
           style={{ background: 'var(--brand-surface-dark)' }}>
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Confirm sign out</h1>
        <p className="mb-8 text-center" style={{ color: 'var(--brand-muted)' }}>
          {confirming.first_name} {confirming.last_name} · signed in at {signedInAt}
        </p>
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={() => handleConfirmSignOut(confirming)}
            disabled={loading}
            className="w-full py-5 rounded-2xl text-white font-semibold text-xl disabled:opacity-50"
            style={{ background: 'var(--brand-primary)', minHeight: 72 }}
          >
            {loading ? 'Signing out…' : 'Confirm Sign Out'}
          </button>
          <button
            onClick={() => setConfirming(null)}
            className="w-full py-4 rounded-2xl font-medium"
            style={{ color: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8"
         style={{ background: 'var(--brand-surface-dark)' }}>
      <button
        onClick={() => navigate('/kiosk')}
        className="mb-6 self-start text-sm flex items-center gap-1"
        style={{ color: 'var(--brand-primary-light)' }}
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-white mb-1">Sign Out</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--brand-muted)' }}>
        Search by your name or email address
      </p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6 w-full max-w-lg">
        <input
          required
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Your name or email…"
          className="flex-1 px-4 py-4 rounded-xl text-white text-base outline-none"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', minHeight: 56 }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-4 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--brand-primary)', minHeight: 56 }}
        >
          Search
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-center mt-8" style={{ color: 'var(--brand-muted)' }}>
          No active visit found. Please ask reception for help.
        </p>
      )}

      <div className="flex flex-col gap-3 w-full max-w-lg">
        {results.map(visit => {
          const signedInAt = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z')
            .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
          return (
            <button
              key={visit.id}
              onClick={() => setConfirming(visit)}
              className="w-full text-left px-5 py-4 rounded-xl transition-opacity active:opacity-70"
              style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)' }}
            >
              <p className="font-semibold text-white">{visit.first_name} {visit.last_name}</p>
              <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
                {visit.email} · signed in at {signedInAt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kiosk/SignOut.tsx
git commit -m "feat(kiosk): Sign Out screen with search, confirmation flow, and success state"
```

---

## Task 14: Admin Panel

**Files:**
- Create: `src/components/admin/AdminPanel.tsx`

- [ ] **Step 1: Create `src/components/admin/AdminPanel.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import type { Visit } from '../../types.ts';

function formatTime(isoStr: string): string {
  return new Date(isoStr.replace(' ', 'T') + 'Z')
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
}

function isOverdue(visit: Visit): boolean {
  if (visit.signed_out_at) return false;
  const signedIn = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z').getTime();
  return Date.now() - signedIn > 4 * 60 * 60 * 1000;
}

function VisitRow({ visit, onSignOut }: { visit: Visit; onSignOut: (id: number) => void }) {
  const active = !visit.signed_out_at;
  const overdue = isOverdue(visit);

  const borderColor = overdue ? '#f59e0b' : active ? '#059669' : '#334155';
  const statusColor = overdue ? '#f59e0b' : active ? '#059669' : '#475569';
  const statusText = overdue ? '⚠ 4h+ inside' : active ? 'Inside' : 'Left';

  return (
    <div
      className="grid gap-3 px-4 py-3 rounded-xl"
      style={{
        gridTemplateColumns: '1fr 1fr 70px 70px 100px 90px',
        background: active ? 'var(--brand-surface)' : '#0f172a',
        borderLeft: `3px solid ${borderColor}`,
        opacity: active ? 1 : 0.6,
      }}
    >
      <div>
        <p className="text-sm font-semibold text-white">{visit.first_name} {visit.last_name}</p>
        <p className="text-xs" style={{ color: 'var(--brand-muted)' }}>{visit.email}</p>
      </div>
      <div className="text-sm self-center" style={{ color: 'var(--brand-muted)' }}>
        {visit.reason}{visit.person_to_meet ? ` · ${visit.person_to_meet}` : ''}
      </div>
      <div className="text-sm self-center" style={{ color: 'var(--brand-muted)' }}>
        {formatTime(visit.signed_in_at)}
      </div>
      <div className="text-sm self-center" style={{ color: 'var(--brand-muted)' }}>
        {visit.signed_out_at ? formatTime(visit.signed_out_at) : '—'}
      </div>
      <div className="self-center flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
        <span className="text-xs" style={{ color: statusColor }}>{statusText}</span>
      </div>
      <div className="self-center">
        {active && (
          <button
            onClick={() => onSignOut(visit.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity active:opacity-70"
            style={{ background: 'var(--brand-primary)' }}
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (activeOnly) params.set('active', 'true');
      const res = await fetch(`/api/visits?${params}`);
      setVisits(await res.json() as Visit[]);
    } finally {
      setLoading(false);
    }
  }, [date, activeOnly]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  async function handleSignOut(id: number) {
    await fetch(`/api/visits/${id}/signout`, { method: 'PATCH' });
    fetchVisits();
  }

  const filtered = visits.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${v.first_name} ${v.last_name}`.toLowerCase().includes(q) || v.email.toLowerCase().includes(q);
  });

  const stats = {
    inside: visits.filter(v => !v.signed_out_at).length,
    total: visits.length,
    reminders: visits.filter(v => v.reminder_sent).length,
  };

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: 'var(--brand-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'var(--brand-primary)' }}>
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-white">CluePoints — Visitor Register</span>
        </div>
        <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { value: stats.inside, label: 'Currently inside', color: 'var(--brand-primary-light)' },
          { value: stats.total, label: 'Total today', color: 'var(--brand-text)' },
          { value: stats.reminders, label: 'Reminders sent', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-5 py-4 text-center"
               style={{ background: 'var(--brand-surface)' }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--brand-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)', minWidth: 200 }}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)' }}
        />
        <button
          onClick={() => setActiveOnly(v => !v)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: activeOnly ? 'var(--brand-primary)' : 'var(--brand-surface)',
            border: `1px solid ${activeOnly ? 'var(--brand-primary)' : 'var(--brand-border)'}`,
            color: activeOnly ? 'white' : 'var(--brand-muted)',
          }}
        >
          Active only
        </button>
        <button
          onClick={fetchVisits}
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-muted)' }}
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* Table header */}
      <div
        className="grid gap-3 px-4 py-2 mb-2"
        style={{ gridTemplateColumns: '1fr 1fr 70px 70px 100px 90px' }}
      >
        {['Name', 'Reason / Meeting', 'Sign In', 'Sign Out', 'Status', 'Action'].map(h => (
          <span key={h} className="text-xs uppercase tracking-wider" style={{ color: '#475569' }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && !loading && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--brand-muted)' }}>
            No visitors found for the selected filters.
          </p>
        )}
        {filtered.map(v => (
          <VisitRow key={v.id} visit={v} onSignOut={handleSignOut} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminPanel.tsx
git commit -m "feat(admin): admin panel with stats, filterable table, manual sign-out"
```

---

## Task 15: App Routing

**Files:**
- Create: `src/App.tsx`
- Create: `public/index.html` (if not auto-generated by Vite)

- [ ] **Step 1: Create `src/App.tsx`**

```tsx
import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Welcome from './components/kiosk/Welcome.tsx';
import SignInForm from './components/kiosk/SignInForm.tsx';
import Confirmation from './components/kiosk/Confirmation.tsx';
import SignOut from './components/kiosk/SignOut.tsx';
import AdminPanel from './components/admin/AdminPanel.tsx';
import type { Visit } from './types.ts';

export default function App() {
  const [lastVisit, setLastVisit] = useState<Visit | null>(null);

  const handleSignIn = useCallback((visit: Visit) => {
    setLastVisit(visit);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/kiosk" replace />} />
        <Route path="/kiosk" element={<Welcome />} />
        <Route path="/kiosk/sign-in" element={<SignInForm onSignIn={handleSignIn} />} />
        <Route path="/kiosk/confirmation" element={<Confirmation visit={lastVisit} />} />
        <Route path="/kiosk/sign-out" element={<SignOut />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/kiosk" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Verify the Vite `index.html` exists (Vite creates it at project root)**

```bash
ls index.html
```

If missing, create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CluePoints — Visitor Register</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Start the dev server and verify both routes work**

```bash
npm run dev
```

Open http://localhost:5173 — should redirect to `/kiosk` and show the Welcome screen.
Open http://localhost:5173/admin — should show the Admin Panel.

Stop the dev server with Ctrl+C.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx index.html
git commit -m "feat(frontend): wire App routing — kiosk flow and admin panel"
```

---

## Task 16: Azure Deployment Config

**Files:**
- Create: `Dockerfile`
- Create: `README.md`
- Modify: `server/index.ts` — confirm static file path is correct for the Docker build

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
RUN npm install tsx

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
```

- [ ] **Step 2: Create `README.md`**

```markdown
# CluePoints Visitor Register

Touch-optimised visitor registration kiosk for CluePoints reception.

## Local Development

\`\`\`bash
cp .env.example .env
# Fill in Azure AD credentials
npm install
npm run dev
\`\`\`

- Kiosk: http://localhost:5173/kiosk  
- Admin: http://localhost:5173/admin

## Azure AD App Registration

1. Create an App Registration in Azure Active Directory
2. Under **API permissions**, add:
   - `User.Read.All` (Application)
   - `Mail.Send` (Application)
3. Grant admin consent
4. Create a **Client Secret** and note the value
5. Fill in `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` in your `.env`

## Azure App Service Deployment

\`\`\`bash
# Build and push Docker image
docker build -t clue-register .
docker tag clue-register <acr>.azurecr.io/clue-register:latest
docker push <acr>.azurecr.io/clue-register:latest
\`\`\`

Set the following App Service environment variables:
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `GRAPH_SERVICE_ACCOUNT`
- `DB_PATH` → `/home/visitors.db` (persists across restarts)
- `NODE_ENV` → `production`
- `PORT` → `3000`

## Environment Variables

| Variable | Description |
|---|---|
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_CLIENT_SECRET` | App registration client secret |
| `GRAPH_SERVICE_ACCOUNT` | Mailbox for sending reminders (e.g. `noreply@cluepoints.com`) |
| `DB_PATH` | SQLite file path (default: `./visitors.db`) |
| `PORT` | Server port (default: `3000`) |
| `NODE_ENV` | `development` or `production` |
```

- [ ] **Step 3: Verify production build**

```bash
npm run build
```

Expected: `dist/` directory created with compiled frontend assets.

- [ ] **Step 4: Run all tests one final time**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile README.md
git commit -m "chore: add Dockerfile and deployment README for Azure App Service"
```

---

## Self-Review Checklist

- [x] **Kiosk screens**: Welcome, Sign In form, Confirmation, Sign Out — all covered (Tasks 10–13)
- [x] **Admin panel**: stats, filterable table, date picker, active-only toggle, manual sign-out — covered (Task 14)
- [x] **M365 employee dropdown**: Graph API client with 5-min cache — Task 4, used in Task 11
- [x] **4-hour reminder job**: setInterval every 15 min, email via Graph — Tasks 4 + 7
- [x] **Inactivity reset (30s)**: `useInactivityReset` hook used in Welcome, SignInForm, SignOut — Task 9
- [x] **Confirmation auto-return (10s)**: countdown timer in Confirmation.tsx — Task 12
- [x] **Data model**: all 10 columns covered in `createDb()` — Task 3
- [x] **All 4 API endpoints**: POST /api/visits, PATCH /api/visits/:id/signout, GET /api/visits, GET /api/employees — Tasks 5 + 6
- [x] **Azure deployment**: Dockerfile + README — Task 16
- [x] **Env vars**: all documented in .env.example and README
- [x] **TDD**: all server-side logic has failing-test-first steps
- [x] **Branding**: CSS vars with CluePoints purple applied throughout
