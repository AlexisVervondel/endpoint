export interface Summary {
  total_commands: number
  total_input: number
  total_output: number
  total_saved: number
  avg_savings_pct: number
  total_time_ms: number
  avg_time_ms: number
}

export interface DayStats {
  date: string
  commands: number
  input_tokens: number
  output_tokens: number
  saved_tokens: number
  savings_pct: number
  total_time_ms: number
  avg_time_ms: number
}

export interface WeekStats {
  week_start: string
  week_end: string
  commands: number
  input_tokens: number
  output_tokens: number
  saved_tokens: number
  savings_pct: number
  total_time_ms: number
  avg_time_ms: number
}

export interface MonthStats {
  month: string
  commands: number
  input_tokens: number
  output_tokens: number
  saved_tokens: number
  savings_pct: number
  total_time_ms: number
  avg_time_ms: number
}

export interface StatsResponse {
  summary: Summary
  daily?: DayStats[]
  weekly?: WeekStats[]
  monthly?: MonthStats[]
}
