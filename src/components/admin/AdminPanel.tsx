import { useState, useEffect, useCallback } from 'react';
import type { Visit } from '../../types.ts';

function formatTime(isoStr: string): string {
  return new Date(isoStr.replace(' ', 'T') + 'Z')
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
}

function isOverdue(visit: Visit): boolean {
  if (visit.signed_out_at) return false;
  const signedIn = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z').getTime();
  return Date.now() - signedIn > 4 * 60 * 60 * 1000;
}

function VisitRow({ visit, onSignOut }: { visit: Visit; onSignOut: (id: number) => void }) {
  const active = !visit.signed_out_at;
  const overdue = isOverdue(visit);

  const borderColor = overdue ? '#f59e0b' : active ? '#059669' : '#334155';
  const statusColor = overdue ? '#f59e0b' : active ? '#059669' : '#475569';
  const statusText = overdue ? '⚠ 4h+ inside' : active ? 'Inside' : 'Left';

  return (
    <div
      className="grid gap-3 px-4 py-3 rounded-xl"
      style={{
        gridTemplateColumns: '1fr 1fr 70px 70px 100px 90px',
        background: active ? 'var(--brand-surface)' : '#0f172a',
        borderLeft: `3px solid ${borderColor}`,
        opacity: active ? 1 : 0.6,
      }}
    >
      <div>
        <p className="text-sm font-semibold text-white">{visit.first_name} {visit.last_name}</p>
        <p className="text-xs" style={{ color: 'var(--brand-muted)' }}>{visit.email}</p>
      </div>
      <div className="text-sm self-center" style={{ color: 'var(--brand-muted)' }}>
        {visit.reason}{visit.person_to_meet ? ` · ${visit.person_to_meet}` : ''}
      </div>
      <div className="text-sm self-center" style={{ color: 'var(--brand-muted)' }}>
        {formatTime(visit.signed_in_at)}
      </div>
      <div className="text-sm self-center" style={{ color: 'var(--brand-muted)' }}>
        {visit.signed_out_at ? formatTime(visit.signed_out_at) : '—'}
      </div>
      <div className="self-center flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
        <span className="text-xs" style={{ color: statusColor }}>{statusText}</span>
      </div>
      <div className="self-center">
        {active && (
          <button
            onClick={() => onSignOut(visit.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity active:opacity-70"
            style={{ background: 'var(--brand-primary)' }}
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (activeOnly) params.set('active', 'true');
      const res = await fetch(`/api/visits?${params}`);
      setVisits(await res.json() as Visit[]);
    } finally {
      setLoading(false);
    }
  }, [date, activeOnly]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  async function handleSignOut(id: number) {
    await fetch(`/api/visits/${id}/signout`, { method: 'PATCH' });
    fetchVisits();
  }

  const filtered = visits.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${v.first_name} ${v.last_name}`.toLowerCase().includes(q) || v.email.toLowerCase().includes(q);
  });

  const stats = {
    inside: visits.filter(v => !v.signed_out_at).length,
    total: visits.length,
    reminders: visits.filter(v => v.reminder_sent).length,
  };

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: 'var(--brand-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'var(--brand-primary)' }}>
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-white">CluePoints — Visitor Register</span>
        </div>
        <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { value: stats.inside, label: 'Currently inside', color: 'var(--brand-primary-light)' },
          { value: stats.total, label: 'Total today', color: 'var(--brand-text)' },
          { value: stats.reminders, label: 'Reminders sent', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-5 py-4 text-center"
               style={{ background: 'var(--brand-surface)' }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--brand-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)', minWidth: 200 }}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)' }}
        />
        <button
          onClick={() => setActiveOnly(v => !v)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: activeOnly ? 'var(--brand-primary)' : 'var(--brand-surface)',
            border: `1px solid ${activeOnly ? 'var(--brand-primary)' : 'var(--brand-border)'}`,
            color: activeOnly ? 'white' : 'var(--brand-muted)',
          }}
        >
          Active only
        </button>
        <button
          onClick={fetchVisits}
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-muted)' }}
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* Table header */}
      <div
        className="grid gap-3 px-4 py-2 mb-2"
        style={{ gridTemplateColumns: '1fr 1fr 70px 70px 100px 90px' }}
      >
        {['Name', 'Reason / Meeting', 'Sign In', 'Sign Out', 'Status', 'Action'].map(h => (
          <span key={h} className="text-xs uppercase tracking-wider" style={{ color: '#475569' }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && !loading && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--brand-muted)' }}>
            No visitors found for the selected filters.
          </p>
        )}
        {filtered.map(v => (
          <VisitRow key={v.id} visit={v} onSignOut={handleSignOut} />
        ))}
      </div>
    </div>
  );
}
