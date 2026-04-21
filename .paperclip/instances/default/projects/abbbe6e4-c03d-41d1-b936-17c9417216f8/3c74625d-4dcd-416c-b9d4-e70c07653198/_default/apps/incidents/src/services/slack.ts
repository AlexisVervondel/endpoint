import type { Incident } from '@its/shared'

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export async function notifySlack(event: 'opened' | 'closed' | 'escalated', incident: Incident) {
  if (!WEBHOOK_URL) return

  const color =
    incident.severity === 'SEV1'
      ? '#cc0000'
      : incident.severity === 'SEV2'
        ? '#ff6600'
        : incident.severity === 'SEV3'
          ? '#ffcc00'
          : '#36a64f'

  const statusEmoji = event === 'opened' ? ':red_circle:' : event === 'closed' ? ':white_check_mark:' : ':large_orange_circle:'

  const payload = {
    attachments: [
      {
        color,
        title: `${statusEmoji} [${incident.severity}] Incident ${event.toUpperCase()}: ${incident.title}`,
        fields: [
          { title: 'Status', value: incident.status, short: true },
          { title: 'Severity', value: incident.severity, short: true },
          { title: 'Commander', value: incident.commanderId, short: true },
          {
            title: 'Affected Systems',
            value: incident.affectedSystems.join(', ') || 'N/A',
            short: false,
          },
        ],
        footer: 'ITS Incident Tracker',
        ts: Math.floor(Date.now() / 1000).toString(),
      },
    ],
  }

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    console.error('Slack notification failed:', response.statusText)
  }
}
