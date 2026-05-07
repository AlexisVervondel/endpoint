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
    },
  };
}

export type Db = ReturnType<typeof createDb>;

export const db = createDb(process.env.DB_PATH ?? 'visitors.db');
