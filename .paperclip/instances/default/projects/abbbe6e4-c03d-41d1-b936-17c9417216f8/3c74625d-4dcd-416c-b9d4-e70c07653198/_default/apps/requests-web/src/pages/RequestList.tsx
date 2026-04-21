import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { StatusBadge, CategoryBadge, PriorityBadge } from '../components/StatusBadge.js'
import type { ItRequest } from '@its/shared'

export function RequestListPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ItRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [requesterFilter, setRequesterFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    api.requests
      .list({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(requesterFilter ? { requesterId: requesterFilter } : {}),
      })
      .then(setRequests)
      .finally(() => setLoading(false))
  }, [statusFilter, categoryFilter, requesterFilter])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">My Requests</h1>
        <button className="btn-primary" onClick={() => navigate('/submit')}>
          + New Request
        </button>
      </div>

      <div className="filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          <option value="hardware">Hardware</option>
          <option value="software_license">Software License</option>
          <option value="access">Access</option>
          <option value="infra">Infra</option>
        </select>
        <input
          style={{ width: 180 }}
          placeholder="Filter by requester ID"
          value={requesterFilter}
          onChange={(e) => setRequesterFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="empty">No requests found.</div>
      ) : (
        requests.map((r) => <RequestCard key={r.id} req={r} />)
      )}
    </div>
  )
}

function RequestCard({ req }: { req: ItRequest }) {
  const slaDate = new Date(req.slaDueAt)
  const now = new Date()
  const slaPast = now > slaDate && !['completed', 'cancelled', 'rejected'].includes(req.status)

  return (
    <div className="card">
      <div className="card-title">
        <Link to={`/requests/${req.id}`}>{req.title}</Link>
      </div>
      <div className="card-meta" style={{ marginTop: 8 }}>
        <StatusBadge status={req.status} />
        <CategoryBadge category={req.category} />
        <PriorityBadge priority={req.priority} />
        <span>{req.requesterEmail}</span>
        <span>SLA: {slaDate.toLocaleDateString()}</span>
        {(slaPast || req.slaBreach) && <span className="sla-breach">SLA BREACH</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(req.createdAt).toLocaleString()}
        </span>
      </div>
    </div>
  )
}
