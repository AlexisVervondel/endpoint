const INPUT_PRICE_PER_M = 3.0
const OUTPUT_PRICE_PER_M = 15.0

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function estimateSavedCost(savedInputTokens: number, savedOutputTokens = 0): string {
  const cost =
    (savedInputTokens / 1_000_000) * INPUT_PRICE_PER_M +
    (savedOutputTokens / 1_000_000) * OUTPUT_PRICE_PER_M
  return `$${cost.toFixed(4)}`
}

export function fmtMs(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${ms}ms`
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}
