import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  active: '#3b82f6',
  completed: '#10b981',
  cancelled: '#6b7280',
}

const PROV_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  in_progress: '#3b82f6',
  done: '#6b7280',
  rejected: '#ef4444',
}

const CAT_COLORS: Record<string, string> = {
  hardware: '#8b5cf6',
  accounts: '#3b82f6',
  access: '#f59e0b',
  documentation: '#10b981',
  other: '#6b7280',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: color + '20',
      color,
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
    }}>
      {label}
    </span>
  )
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3 }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: pct === 100 ? '#10b981' : '#3b82f6',
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
        {completed}/{total}
      </span>
    </div>
  )
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [emp, setEmp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingProv, setUpdatingProv] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.employees.get(id!)
      setEmp(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function completeItem(itemId: string) {
    setCompleting(itemId)
    try {
      await api.checklist.complete(id!, itemId, emp.managerId)
      await load()
    } finally {
      setCompleting(null)
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this checklist item?')) return
    await api.checklist.delete(id!, itemId)
    await load()
  }

  async function changeStatus(status: string) {
    setUpdatingStatus(true)
    try {
      await api.employees.update(id!, { status })
      await load()
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function updateProvStatus(reqId: string, status: string) {
    setUpdatingProv(reqId)
    try {
      await api.provisioning.update(id!, reqId, { status })
      await load()
    } finally {
      setUpdatingProv(null)
    }
  }

  if (loading) return <div className="page"><p style={{ color: '#6b7280' }}>Loading…</p></div>
  if (error) return <div className="page"><div className="error-banner">{error}</div></div>
  if (!emp) return null

  const checklist: any[] = emp.checklist ?? []
  const documents: any[] = emp.documents ?? []
  const provisioning: any[] = emp.provisioning ?? []

  const completedItems = checklist.filter((i) => i.completedAt).length
  const byCategory = checklist.reduce<Record<string, any[]>>((acc, item) => {
    const bucket = acc[item.category] ?? []
    acc[item.category] = bucket
    bucket.push(item)
    return acc
  }, {})

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <h1 className="page-title">{emp.fullName}</h1>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            {emp.jobTitle} · {emp.department}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge label={emp.status} color={STATUS_COLORS[emp.status] ?? '#6b7280'} />
          {emp.status !== 'completed' && emp.status !== 'cancelled' && (
            <select
              style={{ width: 'auto' }}
              value={emp.status}
              disabled={updatingStatus}
              onChange={(e) => changeStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          {/* Checklist */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="section-title" style={{ margin: 0 }}>Onboarding Checklist</span>
              <ProgressBar completed={completedItems} total={checklist.length} />
            </div>

            {checklist.length === 0 ? (
              <p className="empty">No checklist items.</p>
            ) : (
              Object.entries(byCategory).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6 }}>
                    <Badge label={cat} color={CAT_COLORS[cat] ?? '#6b7280'} />
                  </div>
                  {items.map((item) => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 0', borderBottom: '1px solid #f3f4f6',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                        border: `2px solid ${item.completedAt ? '#10b981' : '#d1d5db'}`,
                        background: item.completedAt ? '#10b981' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: 'white',
                      }}>
                        {item.completedAt ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 500,
                          textDecoration: item.completedAt ? 'line-through' : 'none',
                          color: item.completedAt ? '#9ca3af' : '#111827',
                        }}>
                          {item.title}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{item.description}</div>
                        )}
                        {item.completedAt && (
                          <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                            Completed by {item.completedBy} · {new Date(item.completedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {!item.completedAt && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn-success btn-sm"
                            disabled={completing === item.id}
                            onClick={() => completeItem(item.id)}
                          >
                            {completing === item.id ? '…' : 'Done'}
                          </button>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => deleteItem(item.id)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Provisioning */}
          <div className="card">
            <div className="section-title">Provisioning Requests</div>
            {provisioning.length === 0 ? (
              <p className="empty">No provisioning requests.</p>
            ) : (
              provisioning.map((req) => (
                <div key={req.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid #f3f4f6',
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{req.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {req.requestType.replace('_', ' ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge label={req.status} color={PROV_STATUS_COLORS[req.status] ?? '#6b7280'} />
                    {req.status !== 'done' && req.status !== 'rejected' && (
                      <select
                        style={{ width: 'auto', fontSize: 12, padding: '3px 6px' }}
                        value={req.status}
                        disabled={updatingProv === req.id}
                        onChange={(e) => updateProvStatus(req.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title">Employee Info</div>
            {[
              { label: 'Email', value: emp.email },
              { label: 'Start Date', value: emp.startDate },
              { label: 'Manager', value: emp.managerId },
              { label: 'Created', value: new Date(emp.createdAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label} className="field-row">
                <span className="field-label">{label}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{value}</span>
              </div>
            ))}
            {emp.notes && (
              <div style={{ marginTop: 10, fontSize: 13, color: '#374151' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notes</div>
                {emp.notes}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="card">
            <div className="section-title">Documents ({documents.length})</div>
            {documents.length === 0 ? (
              <p style={{ fontSize: 12, color: '#6b7280' }}>No documents uploaded.</p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} style={{
                  padding: '7px 0',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 500 }}>{doc.fileName}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {doc.documentType.replace('_', ' ')} · {(doc.sizeBytes / 1024).toFixed(0)} KB
                    · {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
