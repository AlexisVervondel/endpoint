import { useState } from 'react'
import { api } from '../api/client.js'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function CreateIncidentModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'SEV3',
    commanderId: '',
    affectedSystems: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.incidents.create({
        title: form.title,
        description: form.description,
        severity: form.severity,
        commanderId: form.commanderId,
        affectedSystems: form.affectedSystems
          ? form.affectedSystems.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      })
      onCreated()
    } catch (err: any) {
      setError(err.message ?? 'Failed to create incident')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Open Incident</div>
        <form onSubmit={submit}>
          <div className="form-field">
            <label>Title *</label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Brief description of what's happening" />
          </div>
          <div className="form-field">
            <label>Description *</label>
            <textarea required rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detailed description, symptoms, impact..." />
          </div>
          <div className="form-field">
            <label>Severity *</label>
            <select value={form.severity} onChange={(e) => set('severity', e.target.value)}>
              <option value="SEV1">SEV1 – Critical (1h SLA)</option>
              <option value="SEV2">SEV2 – High (4h SLA)</option>
              <option value="SEV3">SEV3 – Medium (24h SLA)</option>
              <option value="SEV4">SEV4 – Low (72h SLA)</option>
            </select>
          </div>
          <div className="form-field">
            <label>Incident Commander *</label>
            <input required value={form.commanderId} onChange={(e) => set('commanderId', e.target.value)} placeholder="User ID or name" />
          </div>
          <div className="form-field">
            <label>Affected Systems (comma-separated)</label>
            <input value={form.affectedSystems} onChange={(e) => set('affectedSystems', e.target.value)} placeholder="api, database, auth-service" />
          </div>
          {error && <p style={{ color: 'var(--sev1)', marginBottom: 10, fontSize: 12 }}>{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Opening…' : 'Open Incident'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
