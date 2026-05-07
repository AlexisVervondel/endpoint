import { ClientSecretCredential } from '@azure/identity';
import type { Employee, Visit } from './types.ts';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface GraphClient {
  listEmployees(): Promise<Employee[]>;
  sendReminderEmail(visit: Visit): Promise<void>;
}

export function createGraphClient(): GraphClient {
  let credential: ClientSecretCredential | null = null;

  function getCredential(): ClientSecretCredential {
    if (!credential) {
      credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID!,
        process.env.AZURE_CLIENT_ID!,
        process.env.AZURE_CLIENT_SECRET!,
      );
    }
    return credential;
  }

  let cache: Employee[] | null = null;
  let cacheTime = 0;

  async function getToken(): Promise<string> {
    const token = await getCredential().getToken('https://graph.microsoft.com/.default');
    return token.token;
  }

  async function listEmployees(): Promise<Employee[]> {
    if (cache && Date.now() - cacheTime < CACHE_TTL_MS) return cache;

    const token = await getToken();
    const res = await fetch(
      `${GRAPH_BASE}/users?$select=displayName,mail&$top=999&$filter=accountEnabled eq true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) throw new Error(`Graph listUsers failed: ${res.status}`);
    const data = await res.json() as { value: Employee[] };
    cache = data.value.filter(e => e.mail);
    cacheTime = Date.now();
    return cache;
  }

  async function sendReminderEmail(visit: Visit): Promise<void> {
    const token = await getToken();
    const serviceAccount = process.env.GRAPH_SERVICE_ACCOUNT!;
    const signedInAt = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z')
      .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });

    const body = {
      message: {
        subject: 'Reminder: please sign out at CluePoints reception',
        body: {
          contentType: 'HTML',
          content: `
            <p>Dear ${visit.first_name},</p>
            <p>Our records show you signed in at CluePoints reception at <strong>${signedInAt}</strong> and have not yet signed out.</p>
            <p>Please return to the reception tablet to sign out when you leave.</p>
            <p>Thank you,<br/>CluePoints Reception</p>
          `,
        },
        toRecipients: [{ emailAddress: { address: visit.email } }],
      },
    };

    const res = await fetch(`${GRAPH_BASE}/users/${serviceAccount}/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Graph sendMail failed: ${res.status}`);
  }

  return { listEmployees, sendReminderEmail };
}

export const graphClient: GraphClient = createGraphClient();
