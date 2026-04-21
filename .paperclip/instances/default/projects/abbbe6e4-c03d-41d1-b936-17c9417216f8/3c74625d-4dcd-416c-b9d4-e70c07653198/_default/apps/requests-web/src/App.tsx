import { Routes, Route, NavLink } from 'react-router-dom'
import { RequestListPage } from './pages/RequestList.js'
import { RequestDetailPage } from './pages/RequestDetail.js'
import { SubmitRequestPage } from './pages/SubmitRequest.js'
import { AdminQueuePage } from './pages/AdminQueue.js'

export function App() {
  return (
    <>
      <nav className="nav">
        <span className="nav-brand">IT Request Tracker</span>
        <NavLink to="/" end>My Requests</NavLink>
        <NavLink to="/submit">Submit</NavLink>
        <NavLink to="/admin">Admin Queue</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<RequestListPage />} />
        <Route path="/submit" element={<SubmitRequestPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
        <Route path="/admin" element={<AdminQueuePage />} />
      </Routes>
    </>
  )
}
