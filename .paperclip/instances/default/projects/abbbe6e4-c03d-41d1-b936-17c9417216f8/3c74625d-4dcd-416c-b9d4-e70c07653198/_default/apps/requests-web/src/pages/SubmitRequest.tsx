import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import type { RequestCategory, RequestPriority } from '@its/shared'

export function SubmitRequestPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'hardware' as RequestCategory,
    priority: 'medium' as RequestPriority,
    requesterId: '',
    requesterEmail: '',
    managerId: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const req = await api.requests.create({
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        requesterId: form.requesterId,
        requesterEmail: form.requesterEmail,
        ...(form.managerId ? { managerId: form.managerId } : {}),
      })
      navigate(`/requests/${req.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Submit IT Request</h1>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <label>Request Title *</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. MacBook Pro for new hire"
              required
            />
          </div>

          <div>
            <label>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe what you need and why"
              required
              style={{ minHeight: 100 }}
            />
          </div>

          <div className="form-row">
            <div>
              <label>Category *</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="hardware">Hardware</option>
                <option value="software_license">Software License</option>
                <option value="access">Access Grant</option>
                <option value="infra">Infra Change</option>
              </select>
            </div>
            <div>
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label>Your ID / Username *</label>
              <input
                value={form.requesterId}
                onChange={(e) => set('requesterId', e.target.value)}
                placeholder="e.g. jsmith"
                required
              />
            </div>
            <div>
              <label>Your Email *</label>
              <input
                type="email"
                value={form.requesterEmail}
                onChange={(e) => set('requesterEmail', e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label>Manager ID (for approval routing)</label>
            <input
              value={form.managerId}
              onChange={(e) => set('managerId', e.target.value)}
              placeholder="e.g. jdoe"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/')}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
