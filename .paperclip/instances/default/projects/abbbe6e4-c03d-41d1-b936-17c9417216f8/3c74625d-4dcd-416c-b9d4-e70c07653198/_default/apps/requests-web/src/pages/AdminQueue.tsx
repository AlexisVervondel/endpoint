import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { StatusBadge, CategoryBadge, PriorityBadge } from '../components/StatusBadge.js'
import type { ItRequest, RequestStats } from '@its/shared'

export function AdminQueuePage() {
  const [requests, setRequests] = useState<ItRequest[]>([])
  const [stats, setStats] = useState<RequestStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.requests.list({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
      }),
      api.requests.stats(),
    ])
      .then(([reqs, s]) => {
        setRequests(reqs)
        setStats(s)
      })
      .finally(() => setLoading(false))
  }, [statusFilter, categoryFilter])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">IT Admin Queue</h1>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--status-pending)' }}>
              {stats.byStatus['pending'] ?? 0}
            </div>
            <div className="stat-label">Pending Approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--status-in_progress)' }}>
              {(stats.byStatus['approved'] ?? 0) + (stats.byStatus['in_progress'] ?? 0)}
            </div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
              {stats.slaBreaches}
            </div>
            <div className="stat-label">SLA Breaches</div>
          </div>
          {stats.avgResolutionHours !== null && (
            <div className="stat-card">
              <div className="stat-value">{stats.avgResolutionHours}h</div>
              <div className="stat-label">Avg Resolution</div>
            </div>
          )}
        </div>
      )}

      <div className="filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          <option value="hardware">Hardware</option>
          <option value="software_license">Software License</option>
          <option value="access">Access</option>
          <option value="infra">Infra</option>
        </select>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="empty">No requests in queue.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Requester</th>
                <th>SLA Due</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const slaDate = new Date(r.slaDueAt)
                const now = new Date()
                const slaPast = now > slaDate && !['completed', 'cancelled', 'rejected'].includes(r.status)
                return (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/requests/${r.id}`}>{r.title}</Link>
                    </td>
                    <td><CategoryBadge category={r.category} /></td>
                    <td><PriorityBadge priority={r.priority} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.requesterEmail}</td>
                    <td style={{ fontSize: 12 }}>
                      <span style={slaPast || r.slaBreach ? { color: 'var(--danger)', fontWeight: 600 } : {}}>
                        {slaDate.toLocaleDateString()}
                        {(slaPast || r.slaBreach) && ' ⚠'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
