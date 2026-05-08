import { useState, useCallback, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Welcome from './components/kiosk/Welcome.tsx';
import SignInForm from './components/kiosk/SignInForm.tsx';
import Confirmation from './components/kiosk/Confirmation.tsx';
import SignOut from './components/kiosk/SignOut.tsx';
import AdminPanel from './components/admin/AdminPanel.tsx';
import type { Visit } from './types.ts';

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center px-8 text-center gap-4"
          style={{ background: 'var(--brand-bg)' }}
        >
          <p className="text-white font-semibold text-lg">Something went wrong</p>
          <p className="text-sm" style={{ color: 'var(--brand-muted)', maxWidth: 400 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.assign('/kiosk'); }}
            className="mt-4 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--brand-primary)' }}
          >
            Return to home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [lastVisit, setLastVisit] = useState<Visit | null>(null);

  const handleSignIn = useCallback((visit: Visit) => {
    setLastVisit(visit);
  }, []);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
