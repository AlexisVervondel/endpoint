import { useState, useEffect, useCallback } from 'react';
import type { Visit } from '../../types.ts';
import CluePointsLogo from '@/components/ui/CluePointsLogo';
import ExportModal from './ExportModal';

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function formatTime(isoStr: string): string {
  return new Date(isoStr.replace(' ', 'T') + 'Z')
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
}

function isOverdue(visit: Visit): boolean {
  if (visit.signed_out_at) return false;
  const signedIn = new Date(visit.signed_in_at.replace(' ', 'T') + 'Z').getTime();
  return Date.now() - signedIn > 4 * 60 * 60 * 1000;
}

function StatusBadge({ visit }: { visit: Visit }) {
  const active = !visit.signed_out_at;
  const overdue = isOverdue(visit);

  if (overdue) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ background: 'rgba(245,158,11,.12)', color: '#fbbf24' }}
      >
        <WarningIcon />
        4h+ inside
      </span>
    );
  }
  if (active) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ background: 'rgba(5,150,105,.15)', color: '#34d399' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#059669' }} />
        Inside
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(71,85,105,.2)', color: '#94a3b8' }}
    >
      Left
    </span>
  );
}

function VisitRow({ visit, onSignOut }: { visit: Visit; onSignOut: (id: number) => void }) {
  const active = !visit.signed_out_at;
  const overdue = isOverdue(visit);

  const indicatorColor = overdue ? '#f59e0b' : active ? '#059669' : '#334155';

  return (
    <tr
      className="group transition-colors"
      style={{ opacity: active ? 1 : 0.55, borderBottom: '1px solid rgba(29,58,92,.5)' }}
    >
      {/* Status indicator bar */}
      <td style={{ padding: '16px 0 16px 16px', width: 8 }}>
        <span
          className="block rounded-sm"
          style={{ width: 4, height: 36, background: indicatorColor }}
        />
      </td>

      {/* Name + email */}
      <td style={{ padding: '16px 16px' }}>
        <p className="text-sm font-semibold text-white leading-snug">
          {visit.first_name} {visit.last_name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--brand-muted)' }}>{visit.email}</p>
      </td>

      {/* Reason / meeting */}
      <td style={{ padding: '16px 16px' }}>
        <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>
          {visit.reason}{visit.person_to_meet ? ` · ${visit.person_to_meet}` : ''}
        </span>
      </td>

      {/* Sign in */}
      <td style={{ padding: '16px 16px' }}>
        <span className="text-sm tabular-nums" style={{ color: 'var(--brand-muted)' }}>
          {formatTime(visit.signed_in_at)}
        </span>
      </td>

      {/* Sign out */}
      <td style={{ padding: '16px 16px' }}>
        <span className="text-sm tabular-nums" style={{ color: 'var(--brand-muted)' }}>
          {visit.signed_out_at ? formatTime(visit.signed_out_at) : '—'}
        </span>
      </td>

      {/* Status badge */}
      <td style={{ padding: '16px 16px' }}>
        <StatusBadge visit={visit} />
      </td>

      {/* Action */}
      <td style={{ padding: '16px 16px' }}>
        {active && (
          <button
            onClick={() => onSignOut(visit.id)}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-opacity active:opacity-70"
            style={{ background: 'var(--brand-primary)' }}
          >
            Sign out
          </button>
        )}
      </td>
    </tr>
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  async function handleClearAll() {
    setClearing(true);
    try {
      await fetch('/api/visits', { method: 'DELETE' });
      setVisits([]);
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
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
    {showClearConfirm && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: 'rgba(0,0,0,0.7)' }}
      >
        <div
          className="rounded-2xl px-8 py-7 flex flex-col gap-4"
          style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', maxWidth: 420, width: '100%' }}
        >
          <div>
            <p className="text-base font-semibold text-white mb-1">Clear all visitor records?</p>
            <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
              This will permanently delete every visit from the database. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowClearConfirm(false)}
              disabled={clearing}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#b91c1c', border: '1px solid #b91c1c', opacity: clearing ? 0.6 : 1 }}
            >
              {clearing ? 'Clearing…' : 'Yes, clear all'}
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="min-h-screen flex flex-col items-center px-8 py-10" style={{ background: 'var(--brand-bg)' }}>
      <div className="w-full" style={{ maxWidth: 1100 }}>

        {/* Header */}
        <div className="flex flex-col items-center mb-12">
          <CluePointsLogo width={360} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {tiles.map(s => {
            const active = tileFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => handleTileClick(s.key)}
                className="rounded-xl px-6 py-5 text-center transition-all cursor-pointer"
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
        <div className="flex gap-3 mb-6 items-center flex-wrap">
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
            aria-label="Refresh visits"
            className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
            style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', color: 'var(--brand-muted)' }}
          >
            {loading ? (
              <span style={{ display: 'inline-block', width: 14, height: 14 }}>…</span>
            ) : (
              <RefreshIcon />
            )}
            Refresh
          </button>
          <button
            onClick={() => setShowExport(true)}
            aria-label="Export to PDF"
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-1.5"
            style={{ background: 'var(--brand-primary)', border: '1px solid var(--brand-primary)' }}
          >
            <DownloadIcon />
            Export PDF
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            aria-label="Clear all visitor records"
            className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
            style={{ background: 'var(--brand-surface)', border: '1px solid #7f1d1d', color: '#f87171' }}
          >
            <CloseIcon />
            Clear all
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table
            className="admin-table w-full"
            style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 700 }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--brand-border)' }}>
                <th style={{ width: 8, padding: 0 }} />
                {['Name', 'Reason / Meeting', 'Sign In', 'Sign Out', 'Status', 'Action'].map(h => (
                  <th
                    key={h}
                    className="text-left"
                    style={{ padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', fontWeight: 500 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm" style={{ color: 'var(--brand-muted)' }}>
                    No visitors found for the selected filters.
                  </td>
                </tr>
              )}
              {filtered.map(v => (
                <VisitRow key={v.id} visit={v} onSignOut={handleSignOut} />
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
    </>
  );
}
