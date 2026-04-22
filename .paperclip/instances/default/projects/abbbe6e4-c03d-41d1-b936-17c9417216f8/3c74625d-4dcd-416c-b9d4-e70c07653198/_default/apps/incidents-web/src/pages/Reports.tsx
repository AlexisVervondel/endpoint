import { useState, useEffect } from 'react'
import { api } from '../api/client.js'

const SEVERITIES = ['SEV1', 'SEV2', 'SEV3', 'SEV4'] as const

export function ReportsPage() {
  const [mttr, setMttr] = useState<any>(null)
  const [sla, setSla] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.reports.mttr(), api.reports.sla()])
      .then(([m, s]) => { setMttr(m); setSla(s) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loading"><div className="spinner" />Loading…</div></div>

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 20 }}>Reports (Last 30 days)</h1>

      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>MTTR (Mean Time to Resolve)</h2>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total incidents</div>
          <div className="stat-value">{mttr?.totalIncidents ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg MTTR</div>
          <div className="stat-value">{mttr ? formatMinutes(mttr.averageMttrMinutes) : '—'}</div>
        </div>
        {SEVERITIES.map((s) => (
          <div className="stat-card" key={s}>
            <div className="stat-label"><span className={`badge sev-${s}`}>{s}</span> Avg MTTR</div>
            <div className="stat-value" style={{ fontSize: 16 }}>
              {mttr?.byseverity[s]?.count > 0 ? formatMinutes(mttr.byseverity[s].avgMttrMinutes) : '—'}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>SLA Compliance</h2>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">SLA Met</div>
          <div className="stat-value" style={{ color: 'var(--sev4)' }}>
            {sla ? `${sla.slaMetPercentage}%` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Breached</div>
          <div className="stat-value" style={{ color: sla?.slaBreached > 0 ? 'var(--sev1)' : 'inherit' }}>
            {sla?.slaBreached ?? '—'}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>SLA Threshold</th>
            <th>Total</th>
            <th>Breached</th>
            <th>Met %</th>
          </tr>
        </thead>
        <tbody>
          {SEVERITIES.map((s) => {
            const d = sla?.byseverity[s]
            return (
              <tr key={s}>
                <td><span className={`badge sev-${s}`}>{s}</span></td>
                <td>{d ? formatMinutes(d.slaThresholdMinutes) : '—'}</td>
                <td>{d?.total ?? 0}</td>
                <td>{d?.breached > 0 ? <span className="sla-breach">{d.breached}</span> : 0}</td>
                <td>{d?.total > 0 ? <span style={{ color: d.metPercentage >= 90 ? 'var(--sev4)' : 'var(--sev1)' }}>{d.metPercentage}%</span> : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
