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
