import Database from 'better-sqlite3';
import { copyFileSync, existsSync } from 'fs';
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

export function createDb(localPath: string, persistPath?: string) {
  const db = new Database(localPath);
  db.exec(CREATE_TABLE);

  function persist() {
    if (!persistPath) return;
    try {
      copyFileSync(localPath, persistPath);
    } catch (e) {
      console.warn(`[db] Sync to ${persistPath} failed: ${(e as any)?.message}`);
    }
  }

  return {
    createVisit(input: CreateVisitInput): Visit {
      const stmt = db.prepare(`
        INSERT INTO visits (first_name, last_name, email, phone, reason, person_to_meet, signed_in_at)
        VALUES (@first_name, @last_name, @email, @phone, @reason, @person_to_meet, @signed_in_at)
      `);
      const signed_in_at = nowUtc();
      const result = stmt.run({ ...input, person_to_meet: input.person_to_meet ?? null, signed_in_at });
      const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid) as Visit;
      persist();
      return visit;
    },

    signOutVisit(id: number): Visit | null {
      const signed_out_at = nowUtc();
      const info = db.prepare(
        'UPDATE visits SET signed_out_at = ? WHERE id = ? AND signed_out_at IS NULL'
      ).run(signed_out_at, id);
      if (info.changes === 0) return null;
      const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(id) as Visit;
      persist();
      return visit;
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

    getVisitsByRange({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }): Visit[] {
      return db.prepare(`
        SELECT * FROM visits
        WHERE DATE(signed_in_at) >= ? AND DATE(signed_in_at) <= ?
        ORDER BY signed_in_at ASC
      `).all(dateFrom, dateTo) as Visit[];
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
      persist();
    },

    deleteAllVisits(): number {
      const result = db.prepare('DELETE FROM visits').run();
      persist();
      return result.changes;
    },
  };
}

export type Db = ReturnType<typeof createDb>;

export async function initDb(dbPath: string): Promise<Db> {
  // Azure Files SMB mounts don't support POSIX byte-range locks (fcntl F_SETLK returns
  // EACCES), which SQLite requires for exclusive write access. Work around by copying the
  // database to ephemeral local storage on startup and syncing back after each write.
  const localPath = '/tmp/visitors-local.db';

  if (existsSync(dbPath)) {
    console.log(`[db] Restoring ${dbPath} → ${localPath}`);
    copyFileSync(dbPath, localPath);
  } else {
    console.log(`[db] No existing database at ${dbPath}, starting fresh`);
  }

  const db = createDb(localPath, dbPath);
  console.log(`[db] Opened ${localPath} (persisting to ${dbPath} on writes)`);
  return db;
}
