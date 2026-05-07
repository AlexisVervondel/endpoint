import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInactivityReset } from '../../hooks/useInactivityReset.ts';
import type { SignInFormData, Employee, Visit } from '../../types.ts';
import { VISIT_REASONS } from '../../types.ts';
import CluePointsLogo from '@/components/ui/CluePointsLogo';

const EMPTY_FORM: SignInFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  reason: '',
  person_to_meet: '',
};

interface Props {
  onSignIn: (visit: Visit) => void;
}

export default function SignInForm({ onSignIn }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignInFormData>(EMPTY_FORM);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useInactivityReset(30_000, () => navigate('/kiosk'));

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(setEmployees)
      .catch(() => {});
  }, []);

  function set<K extends keyof SignInFormData>(key: K, value: SignInFormData[K]) {
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'reason' && value !== 'Meeting' ? { person_to_meet: '' } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reason) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          reason: form.reason,
          ...(form.person_to_meet ? { person_to_meet: form.person_to_meet } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Registration failed');
      }
      const visit = await res.json() as Visit;
      onSignIn(visit);
      navigate('/kiosk/confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = [
    'w-full px-4 py-4 rounded-xl text-white text-base outline-none',
    'border border-solid transition-colors',
  ].join(' ');

  const inputStyle = {
    background: 'var(--brand-surface)',
    borderColor: 'var(--brand-border)',
    color: 'var(--brand-text)',
    minHeight: 56,
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8"
         style={{ background: 'var(--brand-surface-dark)' }}>
      <div className="w-full max-w-lg">
        <button
          onClick={() => navigate('/kiosk')}
          className="mb-6 self-start text-sm flex items-center gap-1"
          style={{ color: 'var(--brand-primary-light)' }}
        >
          ← Back
        </button>

        <CluePointsLogo width="100%" className="mb-8 drop-shadow-lg" />

        <h1 className="text-2xl font-bold text-white mb-1">Register your visit</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--brand-muted)' }}>
          All fields are required
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <div className="grid grid-cols-2 gap-4">
          <input
            required
            placeholder="First name"
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
          <input
            required
            placeholder="Last name"
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <input
          required
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          className={inputClass}
          style={inputStyle}
        />

        <input
          required
          type="tel"
          placeholder="Phone number"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          className={inputClass}
          style={inputStyle}
        />

        <select
          required
          value={form.reason}
          onChange={e => set('reason', e.target.value as SignInFormData['reason'])}
          className={inputClass}
          style={{ ...inputStyle, appearance: 'none' }}
        >
          <option value="">Reason for visit…</option>
          {VISIT_REASONS.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {form.reason === 'Meeting' && (
          <select
            required
            value={form.person_to_meet}
            onChange={e => set('person_to_meet', e.target.value)}
            className={inputClass}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            <option value="">Person to meet…</option>
            {employees.map(emp => (
              <option key={emp.mail} value={emp.displayName}>{emp.displayName}</option>
            ))}
          </select>
        )}

        {error && (
          <p className="text-sm px-4 py-3 rounded-xl" style={{ background: '#450a0a', color: '#fca5a5' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-5 rounded-2xl text-white font-semibold text-xl mt-2 transition-opacity disabled:opacity-50"
          style={{ background: 'var(--brand-primary)', minHeight: 72 }}
        >
          {submitting ? 'Registering…' : 'Register →'}
        </button>
        </form>
      </div>
    </div>
  );
}
