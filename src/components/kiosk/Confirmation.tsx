import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Visit } from '../../types.ts';

interface Props {
  visit: Visit | null;
}

export default function Confirmation({ visit }: Props) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!visit) { navigate('/kiosk'); return; }

    const timer = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(timer); navigate('/kiosk'); return 0; }
        return n - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visit, navigate]);

  if (!visit) return null;

  const signedInAt = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z')
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
         style={{ background: 'var(--brand-surface-dark)' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
           style={{ background: '#059669' }}>
        <span className="text-white text-4xl">✓</span>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">
        Welcome, {visit.first_name}!
      </h1>
      <p className="text-base mb-2" style={{ color: 'var(--brand-muted)' }}>
        Your visit has been registered.
      </p>
      <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
        Signed in at {signedInAt}
      </p>

      {visit.person_to_meet && (
        <p className="mt-3 text-sm" style={{ color: 'var(--brand-muted)' }}>
          Meeting: <span className="text-white">{visit.person_to_meet}</span>
        </p>
      )}

      <p className="mt-12 text-sm" style={{ color: '#475569' }}>
        Returning to home in {countdown}s…
      </p>

      <button
        onClick={() => navigate('/kiosk')}
        className="mt-4 px-6 py-3 rounded-xl text-sm font-medium transition-opacity active:opacity-70"
        style={{ color: 'var(--brand-primary-light)', border: '1px solid var(--brand-border)' }}
      >
        Done
      </button>
    </div>
  );
}
