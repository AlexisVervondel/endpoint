import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { CreateIncidentModal } from '../components/CreateIncidentModal.js'

export function IncidentListPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [filter, setFilter] = useState({ status: '', severity: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filter.status) params.status = filter.status
      if (filter.severity) params.severity = filter.severity
      const data = await api.incidents.list(params)
      setIncidents(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Incidents</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>Open Incident</button>
      </div>

      <div className="filters">
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="mitigated">Mitigated</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filter.severity}
          onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value }))}
        >
          <option value="">All severities</option>
          <option value="SEV1">SEV1</option>
          <option value="SEV2">SEV2</option>
          <option value="SEV3">SEV3</option>
          <option value="SEV4">SEV4</option>
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading…</div>
      ) : incidents.length === 0 ? (
        <div className="empty">No incidents found</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Title</th>
              <th>Status</th>
              <th>Commander</th>
              <th>SLA</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id}>
                <td>
                  <span className={`badge sev-${inc.severity}`}>{inc.severity}</span>
                </td>
                <td>
                  <Link to={`/incidents/${inc.id}`}>{inc.title}</Link>
                </td>
                <td>
                  <span className={`badge status-${inc.status}`}>{inc.status}</span>
                </td>
                <td>{inc.commanderId}</td>
                <td>{inc.slaBreach ? <span className="sla-breach">BREACHED</span> : <span style={{ color: 'var(--sev4)' }}>OK</span>}</td>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(inc.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <CreateIncidentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}
