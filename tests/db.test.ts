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
