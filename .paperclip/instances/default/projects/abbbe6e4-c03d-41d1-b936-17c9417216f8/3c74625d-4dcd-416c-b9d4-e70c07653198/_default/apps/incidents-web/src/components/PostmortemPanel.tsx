import { useState, useEffect } from 'react'
import { api } from '../api/client.js'

interface Props {
  incidentId: string
  incident: any
}

const REQUIRED_FIELDS = [
  { key: 'summary', label: 'Summary', multiline: true },
  { key: 'timeline', label: 'Incident Timeline', multiline: true },
  { key: 'rootCause', label: 'Root Cause', multiline: true },
  { key: 'contributingFactors', label: 'Contributing Factors', multiline: true },
  { key: 'impactSummary', label: 'Impact Summary', multiline: true },
  { key: 'mitigationSteps', label: 'Mitigation Steps', multiline: true },
  { key: 'resolutionSteps', label: 'Resolution Steps', multiline: true },
  { key: 'lessonsLearned', label: 'Lessons Learned', multiline: true },
  { key: 'evidenceCollected', label: 'Evidence Collected (ISO27001 A.16.1.7)', multiline: true },
  { key: 'notificationsSent', label: 'Notifications Sent', multiline: true },
]

export function PostmortemPanel({ incidentId, incident }: Props) {
  const [pm, setPm] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await api.postmortems.get(incidentId)
      setPm(data)
      setForm(data)
    } catch {
      setPm(null)
    }
  }

  useEffect(() => { load() }, [incidentId])

  function initBlankForm() {
    setForm({
      authorId: '',
      summary: '',
      timeline: `Incident opened: ${new Date(incident.createdAt).toLocaleString()}\n`,
      rootCause: '',
      contributingFactors: '',
      impactSummary: '',
      affectedUsersCount: null,
      dataExposed: false,
      mitigationSteps: incident.mitigatedAt ? `Mitigated at: ${new Date(incident.mitigatedAt).toLocaleString()}\n` : '',
      resolutionSteps: incident.resolvedAt ? `Resolved at: ${new Date(incident.resolvedAt).toLocaleString()}\n` : '',
      actionItems: [],
      lessonsLearned: '',
      evidenceCollected: '',
      notificationsSent: '',
    })
    setEditing(true)
  }

  async function save(publish = false) {
    setError('')
    setSaving(true)
    try {
      if (pm) {
        await api.postmortems.update(incidentId, { ...form, publish })
      } else {
        await api.postmortems.create(incidentId, form)
        if (publish) await api.postmortems.update(incidentId, { publish: true })
      }
      await load()
      setEditing(false)
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!editing && !pm) {
    return (
      <div className="card">
        <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          No postmortem yet. Postmortems are required for all SEV1/SEV2 incidents (ISO27001 A.16.1.6).
        </p>
        <button className="btn-primary" onClick={initBlankForm}>Create Postmortem</button>
      </div>
    )
  }

  if (!editing && pm) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              By {pm.authorId} · Updated {new Date(pm.updatedAt).toLocaleString()}
            </span>
            {pm.publishedAt && <span className="badge status-resolved">Published</span>}
          </div>
          <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
        </div>
        {REQUIRED_FIELDS.map(({ key, label }) => (
          <div className="card" key={key}>
            <div className="card-title">{label}</div>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)', fontSize: 13 }}>{pm[key] || '—'}</p>
          </div>
        ))}
        <div className="card">
          <div className="card-title">Data Exposed</div>
          <p style={{ color: pm.dataExposed ? 'var(--sev1)' : 'var(--sev4)' }}>{pm.dataExposed ? 'YES – data was exposed' : 'No'}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="form-field">
        <label>Author ID *</label>
        <input value={form.authorId ?? ''} onChange={(e) => setForm((f) => ({ ...f, authorId: e.target.value }))} required />
      </div>
      {REQUIRED_FIELDS.map(({ key, label }) => (
        <div className="form-field" key={key}>
          <label>{label} *</label>
          <textarea rows={3} value={form[key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} required />
        </div>
      ))}
      <div className="form-field">
        <label>Data Exposed</label>
        <select value={form.dataExposed ? 'yes' : 'no'} onChange={(e) => setForm((f) => ({ ...f, dataExposed: e.target.value === 'yes' }))}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
      {error && <p style={{ color: 'var(--sev1)', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
        <button className="btn-secondary" onClick={() => save(false)} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
        <button className="btn-primary" onClick={() => save(true)} disabled={saving}>{saving ? 'Publishing…' : 'Publish'}</button>
      </div>
    </div>
  )
}
