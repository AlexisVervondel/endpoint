import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @azure/identity before importing graph
vi.mock('@azure/identity', () => ({
  ClientSecretCredential: vi.fn().mockImplementation(function () {
    return {
      getToken: vi.fn().mockResolvedValue({ token: 'mock-token' }),
    };
  }),
}));

// Set required env vars before importing
process.env.AZURE_TENANT_ID = 'test-tenant';
process.env.AZURE_CLIENT_ID = 'test-client';
process.env.AZURE_CLIENT_SECRET = 'test-secret';
process.env.GRAPH_SERVICE_ACCOUNT = 'noreply@cluepoints.com';

import { createGraphClient } from '../server/graph.ts';
import type { Visit } from '../server/types.ts';

const mockVisit: Visit = {
  id: 1,
  first_name: 'Sarah',
  last_name: 'Martin',
  email: 'sarah@example.com',
  phone: '+32470000000',
  reason: 'Meeting',
  person_to_meet: 'John Doe',
  signed_in_at: '2026-05-07 09:00:00',
  signed_out_at: null,
  reminder_sent: 0,
};

describe('createGraphClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listEmployees fetches from Graph API and returns employees', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: [
          { displayName: 'John Doe', mail: 'john@cluepoints.com' },
          { displayName: 'Jane Smith', mail: 'jane@cluepoints.com' },
        ],
      }),
    } as Response);

    const client = createGraphClient();
    const employees = await client.listEmployees();

    expect(employees).toHaveLength(2);
    expect(employees[0].displayName).toBe('John Doe');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/v1.0/users'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }) })
    );
  });

  it('listEmployees returns cached result within TTL without re-fetching', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ value: [{ displayName: 'John Doe', mail: 'john@cluepoints.com' }] }),
    } as Response);

    const client = createGraphClient();
    await client.listEmployees();
    await client.listEmployees();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('sendReminderEmail posts to Graph sendMail endpoint', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response);

    const client = createGraphClient();
    await client.sendReminderEmail(mockVisit);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/sendMail'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sendReminderEmail throws when Graph API returns an error', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as Response);

    const client = createGraphClient();
    await expect(client.sendReminderEmail(mockVisit)).rejects.toThrow('Graph sendMail failed: 403');
  });
});
