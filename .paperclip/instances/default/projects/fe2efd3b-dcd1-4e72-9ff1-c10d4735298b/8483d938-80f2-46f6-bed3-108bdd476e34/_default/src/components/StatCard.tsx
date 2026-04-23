interface Props {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}

export function StatCard({ label, value, sub, highlight = false }: Props) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-1 ${
        highlight
          ? 'border-accent bg-accent/10'
          : 'border-border bg-card'
      }`}
    >
      <span className="text-xs uppercase tracking-widest text-text-dim font-mono">
        {label}
      </span>
      <span className="text-3xl font-semibold font-mono text-text">
        {value}
      </span>
      {sub && (
        <span className="text-xs text-muted font-mono">{sub}</span>
      )}
    </div>
  )
}
