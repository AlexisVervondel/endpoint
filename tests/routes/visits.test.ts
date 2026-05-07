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
