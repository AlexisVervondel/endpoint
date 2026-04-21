import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { TimelinePanel } from '../components/TimelinePanel.js'
import { PostmortemPanel } from '../components/PostmortemPanel.js'
import type { IncidentStatus, IncidentSeverity } from '@its/shared'

const STATUSES: IncidentStatus[] = ['open', 'investigating', 'mitigated', 'resolved', 'closed']
const SEVERITIES: IncidentSeverity[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4']

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [incident, setIncident] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'timeline' | 'postmortem'>('timeline')

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const data = await api.incidents.get(id)
      setIncident(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function updateStatus(status: IncidentStatus) {
    await api.incidents.update(id!, { status })
    load()
  }

  async function updateSeverity(severity: IncidentSeverity) {
    await api.incidents.update(id!, { severity })
    load()
  }

  if (loading) return <div className="page"><p style={{ color: 'var(--text-muted)' }}>Loading…</p></div>
  if (!incident) return <div className="page"><p>Incident not found</p></div>

  return (
    <div className="page">
      <div style={{ marginBottom: 12 }}>
        <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 12 }}>← Back to incidents</Link>
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`badge sev-${incident.severity}`}>{incident.severity}</span>
          <h1 className="page-title">{incident.title}</h1>
          {incident.slaBreach && <span className="badge sla-breach" style={{ background: '#3f1010', fontSize: 11 }}>SLA BREACH</span>}
        </div>
        <span className={`badge status-${incident.status}`}>{incident.status}</span>
      </div>

      <div className="card">
        <p style={{ marginBottom: 12, color: 'var(--text-muted)' }}>{incident.description}</p>
        <div style={{ display: 'flex', gap: 24, fontSize: 12, flexWrap: 'wrap' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Commander: </span>{incident.commanderId}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Opened: </span>{new Date(incident.createdAt).toLocaleString()}</div>
          {incident.resolvedAt && <div><span style={{ color: 'var(--text-muted)' }}>Resolved: </span>{new Date(incident.resolvedAt).toLocaleString()}</div>}
          {incident.affectedSystems?.length > 0 && (
            <div><span style={{ color: 'var(--text-muted)' }}>Affected: </span>{incident.affectedSystems.join(', ')}</div>
          )}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status:</span>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={incident.status === s ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={() => updateStatus(s)}
            disabled={incident.status === s}
          >
            {s}
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>Severity:</span>
        {SEVERITIES.map((s) => (
          <button
            key={s}
            className={incident.severity === s ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={() => updateSeverity(s)}
            disabled={incident.severity === s}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {(['timeline', 'postmortem'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', color: tab === t ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0, padding: '8px 16px', textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'timeline' && <TimelinePanel incidentId={id!} />}
      {tab === 'postmortem' && <PostmortemPanel incidentId={id!} incident={incident} />}
    </div>
  )
}
