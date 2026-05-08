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

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-medium tracking-wide"
      style={{ color: 'var(--brand-muted)' }}
    >
      {children}
    </label>
  );
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
      .then(data => setEmployees(Array.isArray(data) ? data.filter(e => e?.displayName && e?.mail) : []))
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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-8"
      style={{ background: 'var(--brand-surface-dark)' }}
    >
      <div className="w-full max-w-lg">
        <button
          onClick={() => navigate('/kiosk')}
          aria-label="Back to home"
          className="mb-6 self-start text-sm flex items-center gap-1.5 transition-opacity active:opacity-70"
          style={{ color: 'var(--brand-primary-light)' }}
        >
          <BackArrow />
          Back
        </button>

        <CluePointsLogo width={180} className="mb-7 drop-shadow-lg" />

        <h1 className="text-2xl font-bold text-white mb-1">Register your visit</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--brand-muted)' }}>
          All fields are required
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="first_name">First name</FieldLabel>
              <input
                id="first_name"
                required
                placeholder="John"
                autoComplete="given-name"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="last_name">Last name</FieldLabel>
              <input
                id="last_name"
                required
                placeholder="Smith"
                autoComplete="family-name"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <input
              id="email"
              required
              type="email"
              placeholder="john@example.com"
              autoComplete="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="phone">Phone number</FieldLabel>
            <input
              id="phone"
              required
              type="tel"
              placeholder="+32 499 000 000"
              autoComplete="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="reason">Reason for visit</FieldLabel>
            <select
              id="reason"
              required
              value={form.reason}
              onChange={e => set('reason', e.target.value as SignInFormData['reason'])}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select a reason…</option>
              {VISIT_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {form.reason === 'Meeting' && (
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="person_to_meet">Person to meet</FieldLabel>
              {employees.length > 0 ? (
                <select
                  id="person_to_meet"
                  required
                  value={form.person_to_meet}
                  onChange={e => set('person_to_meet', e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="">Select a person…</option>
                  {employees.map(emp => (
                    <option key={emp.mail} value={emp.displayName}>{emp.displayName}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="person_to_meet"
                  required
                  placeholder="Enter the name of the person you are meeting"
                  value={form.person_to_meet}
                  onChange={e => set('person_to_meet', e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                />
              )}
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="text-sm px-4 py-3 rounded-xl flex items-center gap-2"
              style={{ background: '#450a0a', color: '#fca5a5' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
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
