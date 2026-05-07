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
