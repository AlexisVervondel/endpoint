import type { MonthStats } from '../types'
import { fmtTokens, estimateSavedCost } from '../utils'

interface Props {
  data: MonthStats[]
}

export function MonthlyTable({ data }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-xs uppercase tracking-widest text-text-dim font-mono mb-4">
        Monthly Summary
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-text-dim border-b border-border">
              <th className="text-left pb-2 pr-4">Month</th>
              <th className="text-right pb-2 px-4">Cmds</th>
              <th className="text-right pb-2 px-4">Saved</th>
              <th className="text-right pb-2 px-4">Est. Cost Saved</th>
              <th className="text-right pb-2 pl-4">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.month} className="border-b border-border/40 hover:bg-border/20 transition-colors">
                <td className="py-2 pr-4 text-text-dim">{m.month}</td>
                <td className="py-2 px-4 text-right text-text">{m.commands.toLocaleString()}</td>
                <td className="py-2 px-4 text-right text-accent font-semibold">{fmtTokens(m.saved_tokens)}</td>
                <td className="py-2 px-4 text-right text-green-400 font-semibold">
                  {estimateSavedCost(m.saved_tokens)}
                </td>
                <td className="py-2 pl-4 text-right">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-accent/20 text-accent">
                    {m.savings_pct.toFixed(1)}%
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
