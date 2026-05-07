import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Welcome from './components/kiosk/Welcome.tsx';
import SignInForm from './components/kiosk/SignInForm.tsx';
import Confirmation from './components/kiosk/Confirmation.tsx';
import SignOut from './components/kiosk/SignOut.tsx';
import AdminPanel from './components/admin/AdminPanel.tsx';
import type { Visit } from './types.ts';

export default function App() {
  const [lastVisit, setLastVisit] = useState<Visit | null>(null);

  const handleSignIn = useCallback((visit: Visit) => {
    setLastVisit(visit);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/kiosk" replace />} />
        <Route path="/kiosk" element={<Welcome />} />
        <Route path="/kiosk/sign-in" element={<SignInForm onSignIn={handleSignIn} />} />
        <Route path="/kiosk/confirmation" element={<Confirmation visit={lastVisit} />} />
        <Route path="/kiosk/sign-out" element={<SignOut />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/kiosk" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
