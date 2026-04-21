import { Routes, Route, NavLink } from 'react-router-dom'
import { IncidentListPage } from './pages/IncidentList.js'
import { IncidentDetailPage } from './pages/IncidentDetail.js'
import { ReportsPage } from './pages/Reports.js'

export function App() {
  return (
    <>
      <nav className="nav">
        <span className="nav-brand">Incident Tracker</span>
        <NavLink to="/" end>Incidents</NavLink>
        <NavLink to="/reports">Reports</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<IncidentListPage />} />
        <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </>
  )
}
