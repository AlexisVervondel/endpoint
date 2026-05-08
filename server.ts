import { createApp } from './server/index.ts';
import { initDb } from './server/db.ts';
import { graphClient } from './server/graph.ts';
import { startReminderJob } from './server/reminder.ts';

const PORT = process.env.PORT ?? 3000;

initDb(process.env.DB_PATH ?? 'visitors.db').then(db => {
  const app = createApp(db, graphClient);
  startReminderJob(db, graphClient);

  app.listen(PORT, () => {
    console.log(`Visitor Register server running on http://localhost:${PORT}`);
    console.log(`  Kiosk:  http://localhost:${PORT}/kiosk`);
    console.log(`  Admin:  http://localhost:${PORT}/admin`);
  });
}).catch(err => {
  console.error('[server] Failed to initialise database:', err);
  process.exit(1);
});
