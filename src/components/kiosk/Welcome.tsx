import { useNavigate } from 'react-router-dom';
import { useInactivityReset } from '../../hooks/useInactivityReset.ts';

export default function Welcome() {
  const navigate = useNavigate();

  useInactivityReset(30_000, () => {});

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8"
         style={{ background: 'var(--brand-surface-dark)' }}>
      {/* Logo placeholder */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
             style={{ background: 'var(--brand-primary)' }}>
          <span className="text-white font-bold text-2xl">C</span>
        </div>
        <span className="text-white font-semibold text-xl tracking-wide">CluePoints</span>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2 text-center">Welcome</h1>
      <p className="mb-12 text-center" style={{ color: 'var(--brand-muted)' }}>
        Please register your visit below
      </p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <button
          onClick={() => navigate('/kiosk/sign-in')}
          className="w-full py-5 rounded-2xl text-white font-semibold text-xl transition-opacity active:opacity-80"
          style={{ background: 'var(--brand-primary)', minHeight: 72 }}
        >
          Sign In
        </button>

        <button
          onClick={() => navigate('/kiosk/sign-out')}
          className="w-full py-5 rounded-2xl font-semibold text-xl transition-opacity active:opacity-80"
          style={{
            background: 'transparent',
            border: '2px solid var(--brand-primary)',
            color: 'var(--brand-primary-light)',
            minHeight: 72,
          }}
        >
          Sign Out
        </button>
      </div>

      <p className="mt-16 text-xs" style={{ color: '#475569' }}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}
