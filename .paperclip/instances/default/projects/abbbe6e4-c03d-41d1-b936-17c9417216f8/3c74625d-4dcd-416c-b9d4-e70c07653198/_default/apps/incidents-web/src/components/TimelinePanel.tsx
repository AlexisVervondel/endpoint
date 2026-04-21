import { useState, useEffect } from 'react'
import { api } from '../api/client.js'

const EVENT_ICONS: Record<string, string> = {
  comment: '💬',
  status_change: '🔄',
  severity_change: '⚠️',
  escalation: '🚨',
  system: '🤖',
}

interface Props {
  incidentId: string
}

export function TimelinePanel({ incidentId }: Props) {
  const [entries, setEntries] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await api.timeline.list(incidentId)
    setEntries(data)
  }

  useEffect(() => { load() }, [incidentId])

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || !authorId.trim()) return
    setSaving(true)
    try {
      await api.timeline.add(incidentId, { authorId, message })
      setMessage('')
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {entries.length === 0 ? (
        <div className="empty">No timeline entries yet</div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {entries.map((entry) => (
            <div key={entry.id} className="timeline-entry">
              <div className="timeline-meta">
                <div>{EVENT_ICONS[entry.eventType] ?? '•'} {entry.authorId}</div>
                <div>{new Date(entry.createdAt).toLocaleTimeString()}</div>
                <div style={{ fontSize: 10 }}>{new Date(entry.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="timeline-message">{entry.message}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addEntry} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          style={{ width: 160 }}
          placeholder="Your name/ID"
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          required
        />
        <input
          style={{ flex: 1, minWidth: 200 }}
          placeholder="Add a timeline entry…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add Entry'}</button>
      </form>
    </div>
  )
}
