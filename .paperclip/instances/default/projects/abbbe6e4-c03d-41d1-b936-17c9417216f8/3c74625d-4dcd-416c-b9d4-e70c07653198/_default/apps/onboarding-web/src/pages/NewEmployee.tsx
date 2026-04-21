import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

export function NewEmployeePage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    jobTitle: '',
    department: '',
    managerId: '',
    startDate: '',
    notes: '',
  })

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const emp = await api.employees.create(form)
      navigate(`/employees/${emp.id}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">New Hire</h1>
        <button className="btn-secondary" onClick={() => navigate('/')}>Cancel</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row">
            <div>
              <label>Full Name *</label>
              <input required value={form.fullName} onChange={set('fullName')} placeholder="Jane Smith" />
            </div>
            <div>
              <label>Email *</label>
              <input required type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>Job Title *</label>
              <input required value={form.jobTitle} onChange={set('jobTitle')} placeholder="Software Engineer" />
            </div>
            <div>
              <label>Department *</label>
              <input required value={form.department} onChange={set('department')} placeholder="Engineering" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>Manager ID *</label>
              <input required value={form.managerId} onChange={set('managerId')} placeholder="manager@company.com" />
            </div>
            <div>
              <label>Start Date *</label>
              <input required type="date" value={form.startDate} onChange={set('startDate')} />
            </div>
          </div>
          <div>
            <label>Notes</label>
            <textarea value={form.notes} onChange={set('notes')} placeholder="Optional notes for HR / IT…" />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create & Start Onboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
