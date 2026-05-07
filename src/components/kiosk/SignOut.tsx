import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInactivityReset } from '../../hooks/useInactivityReset.ts';
import type { Visit } from '../../types.ts';

export default function SignOut() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Visit[]>([]);
  const [searched, setSearched] = useState(false);
  const [confirming, setConfirming] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useInactivityReset(30_000, () => navigate('/kiosk'));

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/visits?active=true`);
      const visits = await res.json() as Visit[];
      const q = query.toLowerCase();
      setResults(visits.filter(v =>
        `${v.first_name} ${v.last_name}`.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q)
      ));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSignOut(visit: Visit) {
    setLoading(true);
    try {
      const res = await fetch(`/api/visits/${visit.id}/signout`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Sign out failed');
      setDone(true);
      setTimeout(() => navigate('/kiosk'), 3000);
    } catch {
      alert('Could not sign out. Please ask reception for help.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8"
           style={{ background: 'var(--brand-surface-dark)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
             style={{ background: '#059669' }}>
          <span className="text-white text-4xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Goodbye!</h1>
        <p style={{ color: 'var(--brand-muted)' }}>Your visit has been signed out. Have a safe trip!</p>
      </div>
    );
  }

  if (confirming) {
    const signedInAt = new Date(confirming.signed_in_at.replace(' ', 'T') + 'Z')
      .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8"
           style={{ background: 'var(--brand-surface-dark)' }}>
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Confirm sign out</h1>
        <p className="mb-8 text-center" style={{ color: 'var(--brand-muted)' }}>
          {confirming.first_name} {confirming.last_name} · signed in at {signedInAt}
        </p>
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={() => handleConfirmSignOut(confirming)}
            disabled={loading}
            className="w-full py-5 rounded-2xl text-white font-semibold text-xl disabled:opacity-50"
            style={{ background: 'var(--brand-primary)', minHeight: 72 }}
          >
            {loading ? 'Signing out…' : 'Confirm Sign Out'}
          </button>
          <button
            onClick={() => setConfirming(null)}
            className="w-full py-4 rounded-2xl font-medium"
            style={{ color: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8"
         style={{ background: 'var(--brand-surface-dark)' }}>
      <button
        onClick={() => navigate('/kiosk')}
        className="mb-6 self-start text-sm flex items-center gap-1"
        style={{ color: 'var(--brand-primary-light)' }}
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-white mb-1">Sign Out</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--brand-muted)' }}>
        Search by your name or email address
      </p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6 w-full max-w-lg">
        <input
          required
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Your name or email…"
          className="flex-1 px-4 py-4 rounded-xl text-white text-base outline-none"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', minHeight: 56 }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-4 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--brand-primary)', minHeight: 56 }}
        >
          Search
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-center mt-8" style={{ color: 'var(--brand-muted)' }}>
          No active visit found. Please ask reception for help.
        </p>
      )}

      <div className="flex flex-col gap-3 w-full max-w-lg">
        {results.map(visit => {
          const signedInAt = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z')
            .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
          return (
            <button
              key={visit.id}
              onClick={() => setConfirming(visit)}
              className="w-full text-left px-5 py-4 rounded-xl transition-opacity active:opacity-70"
              style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)' }}
            >
              <p className="font-semibold text-white">{visit.first_name} {visit.last_name}</p>
              <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
                {visit.email} · signed in at {signedInAt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
