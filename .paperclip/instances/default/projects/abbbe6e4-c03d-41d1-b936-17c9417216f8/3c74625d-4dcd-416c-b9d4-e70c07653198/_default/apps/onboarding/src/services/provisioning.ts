import { getDb, onboardingProvisioningRequests } from '@its/db'
import type { Db } from '@its/db'
import type { OnboardingEmployee } from '@its/shared'

const DEFAULT_REQUESTS: Array<{
  requestType: 'hardware' | 'software' | 'network_access' | 'email_account' | 'other'
  title: string
  details: Record<string, unknown>
}> = [
  {
    requestType: 'email_account',
    title: 'Create corporate email account',
    details: { priority: 'high', requiredBy: 'day-1' },
  },
  {
    requestType: 'hardware',
    title: 'Provision laptop',
    details: { os: 'latest', accessories: ['monitor', 'keyboard', 'mouse'] },
  },
  {
    requestType: 'software',
    title: 'Install standard software suite',
    details: { apps: ['Slack', 'Zoom', '1Password', 'Chrome'] },
  },
  {
    requestType: 'network_access',
    title: 'Grant VPN access',
    details: { groups: ['employees'] },
  },
  {
    requestType: 'network_access',
    title: 'Grant SSO access',
    details: { groups: ['employees', 'all-apps'] },
  },
]

export async function generateProvisioningRequests(
  employee: OnboardingEmployee,
  requestedBy: string,
  db?: Db,
) {
  const client = db ?? getDb()
  await client.insert(onboardingProvisioningRequests).values(
    DEFAULT_REQUESTS.map((r) => ({
      employeeId: employee.id,
      requestType: r.requestType,
      title: r.title,
      details: r.details,
      status: 'pending' as const,
      requestedBy,
    })),
  )
}
