/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f14',
        card: '#1a1a2e',
        border: '#2a2a3e',
        accent: '#8b5cf6',
        'accent-dim': '#6d28d9',
        muted: '#6b7280',
        text: '#e2e8f0',
        'text-dim': '#94a3b8',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
