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
