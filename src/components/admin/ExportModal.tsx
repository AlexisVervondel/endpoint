import { useState } from 'react';
import type { Visit } from '../../types.ts';
import { exportVisitsPdf } from '../../utils/exportPdf.ts';

interface Props {
  onClose: () => void;
}

type Preset = 'today' | '7days' | 'custom';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ExportModal({ onClose }: Props) {
  const [preset, setPreset] = useState<Preset>('today');
  const [from, setFrom] = useState(() => today());
  const [to, setTo] = useState(() => today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const fromDate = preset === 'today' ? today() : preset === '7days' ? daysAgo(6) : from;
      const toDate = preset === 'custom' ? to : today();

      const params = new URLSearchParams({ date_from: fromDate, date_to: toDate });
      const res = await fetch(`/api/visits/export?${params}`);
      if (!res.ok) throw new Error('Failed to fetch visits');
      const visits = await res.json() as Visit[];

      if (visits.length === 0) {
        setError('No visitors found for this period.');
        return;
      }

      exportVisitsPdf(visits, fromDate, toDate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  const presets: { key: Preset; label: string; sub: string }[] = [
    { key: 'today', label: 'Today', sub: today() },
    { key: '7days', label: 'Last 7 days', sub: `${daysAgo(6)} → ${today()}` },
    { key: 'custom', label: 'Custom range', sub: 'Pick start and end dates' },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl p-6 w-full"
        style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', maxWidth: 420 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Export to PDF</h2>
          <button
            onClick={onClose}
            aria-label="Close export modal"
            className="flex items-center justify-center rounded-lg transition-opacity active:opacity-70"
            style={{ color: 'var(--brand-muted)', width: 36, height: 36 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preset selector */}
        <div className="flex flex-col gap-2 mb-5">
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
              style={{
                background: preset === p.key ? 'var(--brand-surface-dark)' : 'transparent',
                border: `1.5px solid ${preset === p.key ? 'var(--brand-primary)' : 'var(--brand-border)'}`,
              }}
            >
              <span className="text-sm font-medium text-white">{p.label}</span>
              <span className="text-xs" style={{ color: 'var(--brand-muted)' }}>{p.sub}</span>
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {preset === 'custom' && (
          <div className="flex gap-3 mb-5">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: 'var(--brand-muted)' }}>From</label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={e => setFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--brand-surface-dark)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)' }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: 'var(--brand-muted)' }}>To</label>
              <input
                type="date"
                value={to}
                min={from}
                max={today()}
                onChange={e => setTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--brand-surface-dark)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)' }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg mb-4" style={{ background: '#450a0a', color: '#fca5a5' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'var(--brand-primary)' }}
        >
          {!loading && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {loading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
}
