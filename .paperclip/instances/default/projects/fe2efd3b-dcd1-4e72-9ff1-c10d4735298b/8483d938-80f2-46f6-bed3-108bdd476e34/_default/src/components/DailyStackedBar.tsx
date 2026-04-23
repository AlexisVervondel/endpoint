import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DayStats } from '../types'
import { fmtTokens } from '../utils'

interface Props {
  data: DayStats[]
}

export function DailyStackedBar({ data }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-xs uppercase tracking-widest text-text-dim font-mono mb-4">
        Daily Input vs Output Tokens
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
          <Tooltip
            formatter={(value: number) => fmtTokens(value)}
            contentStyle={{
              background: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}
          />
          <Bar dataKey="input_tokens" name="Input" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="output_tokens" name="Output" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
