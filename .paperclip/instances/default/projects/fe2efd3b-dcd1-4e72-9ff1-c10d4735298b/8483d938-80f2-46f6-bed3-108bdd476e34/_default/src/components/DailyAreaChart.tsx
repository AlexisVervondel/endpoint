import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DayStats } from '../types'
import { fmtTokens } from '../utils'

interface Props {
  data: DayStats[]
}

interface TooltipPayload {
  value: number
  payload: DayStats
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs font-mono">
      <div className="text-text-dim mb-1">{label}</div>
      <div className="text-accent font-semibold">
        {fmtTokens(d.value)} saved
      </div>
      <div className="text-text-dim">
        {d.payload.savings_pct.toFixed(1)}% efficiency
      </div>
      <div className="text-text-dim">{d.payload.commands} cmds</div>
    </div>
  )
}

export function DailyAreaChart({ data }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-xs uppercase tracking-widest text-text-dim font-mono mb-4">
        Daily Tokens Saved
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="savedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => fmtTokens(v)}
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="saved_tokens"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#savedGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
