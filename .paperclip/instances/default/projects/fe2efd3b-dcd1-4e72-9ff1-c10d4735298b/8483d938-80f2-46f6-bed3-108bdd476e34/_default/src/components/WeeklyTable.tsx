import type { WeekStats } from '../types'
import { fmtTokens } from '../utils'

interface Props {
  data: WeekStats[]
}

export function WeeklyTable({ data }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-xs uppercase tracking-widest text-text-dim font-mono mb-4">
        Weekly Breakdown
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-text-dim border-b border-border">
              <th className="text-left pb-2 pr-4">Week</th>
              <th className="text-right pb-2 px-4">Cmds</th>
              <th className="text-right pb-2 px-4">Input</th>
              <th className="text-right pb-2 px-4">Saved</th>
              <th className="text-right pb-2 pl-4">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {data.map((w) => (
              <tr key={w.week_start} className="border-b border-border/40 hover:bg-border/20 transition-colors">
                <td className="py-2 pr-4 text-text-dim">
                  {w.week_start} → {w.week_end}
                </td>
                <td className="py-2 px-4 text-right text-text">{w.commands.toLocaleString()}</td>
                <td className="py-2 px-4 text-right text-text">{fmtTokens(w.input_tokens)}</td>
                <td className="py-2 px-4 text-right text-accent font-semibold">{fmtTokens(w.saved_tokens)}</td>
                <td className="py-2 pl-4 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      w.savings_pct >= 70
                        ? 'bg-accent/20 text-accent'
                        : w.savings_pct >= 50
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {w.savings_pct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
