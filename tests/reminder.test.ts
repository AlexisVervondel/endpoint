import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Db } from '../server/db.ts';
import type { GraphClient } from '../server/graph.ts';
import type { Visit } from '../server/types.ts';

const overdueVisit: Visit = {
  id: 1,
  first_name: 'Sarah',
  last_name: 'Martin',
  email: 'sarah@example.com',
  phone: '+32470000000',
  reason: 'Meeting',
  person_to_meet: 'John Doe',
  signed_in_at: '2026-05-07 05:00:00',
  signed_out_at: null,
  reminder_sent: 0,
};

describe('runReminderCheck', () => {
  let mockDb: Partial<Db>;
  let mockGraph: Partial<GraphClient>;

  beforeEach(() => {
    mockDb = {
      getOverdueVisits: vi.fn().mockReturnValue([overdueVisit]),
      markReminderSent: vi.fn(),
    };
    mockGraph = {
      sendReminderEmail: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends a reminder email for each overdue visit', async () => {
    const { runReminderCheck } = await import('../server/reminder.ts');
    await runReminderCheck(mockDb as Db, mockGraph as GraphClient);

    expect(mockGraph.sendReminderEmail).toHaveBeenCalledWith(overdueVisit);
    expect(mockDb.markReminderSent).toHaveBeenCalledWith(1);
  });

  it('does nothing when no overdue visits', async () => {
    mockDb.getOverdueVisits = vi.fn().mockReturnValue([]);
    const { runReminderCheck } = await import('../server/reminder.ts');
    await runReminderCheck(mockDb as Db, mockGraph as GraphClient);

    expect(mockGraph.sendReminderEmail).not.toHaveBeenCalled();
    expect(mockDb.markReminderSent).not.toHaveBeenCalled();
  });

  it('marks reminder sent even if email fails, and continues processing', async () => {
    const secondVisit = { ...overdueVisit, id: 2, email: 'other@example.com' };
    mockDb.getOverdueVisits = vi.fn().mockReturnValue([overdueVisit, secondVisit]);
    mockGraph.sendReminderEmail = vi.fn()
      .mockRejectedValueOnce(new Error('SMTP error'))
      .mockResolvedValueOnce(undefined);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runReminderCheck } = await import('../server/reminder.ts');
    await runReminderCheck(mockDb as Db, mockGraph as GraphClient);

    expect(mockGraph.sendReminderEmail).toHaveBeenCalledTimes(2);
    expect(mockDb.markReminderSent).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
