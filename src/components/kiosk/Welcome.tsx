import { useNavigate } from 'react-router-dom';
import { useInactivityReset } from '../../hooks/useInactivityReset.ts';
import ShaderBackground from '@/components/ui/shader-background';
import CluePointsLogo from '@/components/ui/CluePointsLogo';

export default function Welcome() {
  const navigate = useNavigate();

  useInactivityReset(30_000, () => {});

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-8">
      <ShaderBackground />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <CluePointsLogo width="100%" className="mb-10 drop-shadow-lg -translate-y-[50px]" />

        <h1 className="text-3xl font-bold text-white mb-2 text-center tracking-tight">
          Welcome
        </h1>
        <p className="mb-12 text-center text-base" style={{ color: 'var(--brand-muted)' }}>
          Please register your visit below
        </p>

        <div className="w-full flex flex-col gap-4">
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
              background: 'rgba(0,0,0,0.25)',
              border: '2px solid var(--brand-primary)',
              color: 'var(--brand-primary-light)',
              minHeight: 72,
              backdropFilter: 'blur(4px)',
            }}
          >
            Sign Out
          </button>
        </div>

        <p className="mt-16 text-xs" style={{ color: 'rgba(125,169,196,0.5)' }}>
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}
