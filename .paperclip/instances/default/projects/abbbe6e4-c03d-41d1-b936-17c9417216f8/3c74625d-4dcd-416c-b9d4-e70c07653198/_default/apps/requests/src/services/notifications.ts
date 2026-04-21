import type { ItRequest } from '@its/shared'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export async function notifySlack(
  event: 'submitted' | 'approved' | 'rejected' | 'completed',
  req: ItRequest,
) {
  if (!SLACK_WEBHOOK_URL) return

  const colorMap = { submitted: '#6366f1', approved: '#22c55e', rejected: '#ef4444', completed: '#64748b' }
  const emojiMap = { submitted: ':inbox_tray:', approved: ':white_check_mark:', rejected: ':x:', completed: ':package:' }

  const payload = {
    attachments: [
      {
        color: colorMap[event],
        title: `${emojiMap[event]} IT Request ${event.toUpperCase()}: ${req.title}`,
        fields: [
          { title: 'Category', value: req.category, short: true },
          { title: 'Priority', value: req.priority, short: true },
          { title: 'Requester', value: req.requesterEmail, short: true },
          { title: 'Status', value: req.status, short: true },
          ...(req.rejectionReason
            ? [{ title: 'Rejection reason', value: req.rejectionReason, short: false }]
            : []),
        ],
        footer: 'ITS Request Tracker',
        ts: Math.floor(Date.now() / 1000).toString(),
      },
    ],
  }

  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) console.error('Slack notification failed:', res.statusText)
}
