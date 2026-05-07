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
