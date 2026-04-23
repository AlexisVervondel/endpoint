import { useStats } from './hooks/useStats'
import { StatCard } from './components/StatCard'
import { DailyAreaChart } from './components/DailyAreaChart'
import { DailyStackedBar } from './components/DailyStackedBar'
import { WeeklyTable } from './components/WeeklyTable'
import { MonthlyTable } from './components/MonthlyTable'
import { fmtTokens, estimateSavedCost, fmtMs, todayDate } from './utils'

export default function App() {
  const { data, loading, error, lastUpdated, refresh } = useStats()

  const today = todayDate()
  const todayStats = data?.daily?.find((d) => d.date === today)

  return (
    <div className="min-h-screen bg-bg text-text font-mono">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-accent text-xl font-semibold">◈ RTK</span>
            <span className="text-text-dim text-sm">Token Dashboard</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-dim">
            {lastUpdated && (
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            )}
            <button
              onClick={refresh}
              className="px-3 py-1.5 rounded-lg border border-border hover:border-accent hover:text-accent transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {loading && (
          <div className="text-center text-text-dim py-20 text-sm">
            Loading RTK stats...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {data && (
          <>
            {/* KPI Row */}
            <section>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                  label="Tokens Saved"
                  value={fmtTokens(data.summary.total_saved)}
                  sub={`of ${fmtTokens(data.summary.total_input)} input`}
                  highlight
                />
                <StatCard
                  label="Est. Cost Saved"
                  value={estimateSavedCost(data.summary.total_saved)}
                  sub="at $3/M input tokens"
                />
                <StatCard
                  label="Commands Run"
                  value={data.summary.total_commands.toLocaleString()}
                  sub={`avg ${fmtMs(data.summary.avg_time_ms)}/cmd`}
                />
                <StatCard
                  label="Avg Efficiency"
                  value={`${data.summary.avg_savings_pct.toFixed(1)}%`}
                  sub="tokens filtered"
                />
                <StatCard
                  label="Today Saved"
                  value={todayStats ? fmtTokens(todayStats.saved_tokens) : '—'}
                  sub={
                    todayStats
                      ? `${todayStats.savings_pct.toFixed(1)}% · ${todayStats.commands} cmds`
                      : 'no data yet'
                  }
                />
              </div>
            </section>

            {/* Charts */}
            {data.daily && data.daily.length > 0 && (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DailyAreaChart data={data.daily} />
                <DailyStackedBar data={data.daily} />
              </section>
            )}

            {/* Tables */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.weekly && data.weekly.length > 0 && (
                <WeeklyTable data={data.weekly} />
              )}
              {data.monthly && data.monthly.length > 0 && (
                <MonthlyTable data={data.monthly} />
              )}
            </section>

            {/* Raw summary debug panel */}
            <section>
              <details className="bg-card border border-border rounded-xl">
                <summary className="px-5 py-3 cursor-pointer text-xs text-text-dim hover:text-text transition-colors">
                  Raw JSON
                </summary>
                <pre className="px-5 pb-4 text-xs text-text-dim overflow-x-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
