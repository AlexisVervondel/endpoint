import { useState, useEffect, useCallback } from 'react';
import type { Visit } from '../../types.ts';
import CluePointsLogo from '@/components/ui/CluePointsLogo';
import ExportModal from './ExportModal';

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

type TileFilter = 'inside' | 'total' | 'reminders' | null;

export default function AdminPanel() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [tileFilter, setTileFilter] = useState<TileFilter>(null);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      const res = await fetch(`/api/visits?${params}`);
      setVisits(await res.json() as Visit[]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  async function handleSignOut(id: number) {
    await fetch(`/api/visits/${id}/signout`, { method: 'PATCH' });
    fetchVisits();
  }

  function handleTileClick(key: 'inside' | 'total' | 'reminders') {
    setTileFilter(prev => prev === key ? null : key);
  }

  const stats = {
    inside: visits.filter(v => !v.signed_out_at).length,
    total: visits.length,
    reminders: visits.filter(v => v.reminder_sent).length,
  };

  const filtered = visits.filter(v => {
    if (tileFilter === 'inside' && v.signed_out_at) return false;
    if (tileFilter === 'reminders' && !v.reminder_sent) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${v.first_name} ${v.last_name}`.toLowerCase().includes(q) && !v.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const tiles: { key: 'inside' | 'total' | 'reminders'; value: number; label: string; color: string }[] = [
    { key: 'inside', value: stats.inside, label: 'Currently inside', color: 'var(--brand-primary-light)' },
    { key: 'total', value: stats.total, label: 'Total today', color: 'var(--brand-text)' },
    { key: 'reminders', value: stats.reminders, label: 'Reminders sent', color: '#f59e0b' },
  ];

  return (
    <>
    {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    <div className="min-h-screen flex flex-col items-center px-6 py-8" style={{ background: 'var(--brand-bg)' }}>
      <div className="w-full" style={{ maxWidth: '75%' }}>

        {/* Header */}
        <div className="flex flex-col items-center" style={{ marginBottom: 75 }}>
          <CluePointsLogo width={360} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {tiles.map(s => {
            const active = tileFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => handleTileClick(s.key)}
                className="rounded-xl px-5 py-4 text-center transition-all cursor-pointer"
                style={{
                  background: active ? 'var(--brand-surface-dark)' : 'var(--brand-surface)',
                  border: `2px solid ${active ? s.color : 'transparent'}`,
                  outline: 'none',
                }}
              >
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: active ? s.color : 'var(--brand-muted)' }}>{s.label}</div>
                {active && (
                  <div className="text-xs mt-1.5" style={{ color: s.color, opacity: 0.7 }}>Filtering ✕</div>
                )}
              </button>
            );
          })}
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
            onClick={fetchVisits}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-muted)' }}
          >
            {loading ? '…' : '↻ Refresh'}
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--brand-primary)', border: '1px solid var(--brand-primary)' }}
          >
            ↓ Export PDF
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
    </div>
    </>
  );
}
