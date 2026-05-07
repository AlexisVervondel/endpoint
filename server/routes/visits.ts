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

  router.get('/export', (req, res) => {
    const dateFrom = typeof req.query.date_from === 'string' ? req.query.date_from : new Date().toISOString().slice(0, 10);
    const dateTo = typeof req.query.date_to === 'string' ? req.query.date_to : dateFrom;
    res.json(db.getVisitsByRange({ dateFrom, dateTo }));
  });

  router.get('/', (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const active = req.query.active === 'true';
    res.json(db.getVisits({ date, active }));
  });

  return router;
}
