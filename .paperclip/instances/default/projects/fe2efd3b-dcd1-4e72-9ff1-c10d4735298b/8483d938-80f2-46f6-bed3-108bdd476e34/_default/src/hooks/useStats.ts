import { useState, useEffect, useCallback } from 'react'
import type { StatsResponse } from '../types'

const REFRESH_INTERVAL_MS = 30_000

export function useStats() {
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: StatsResponse = await res.json()
      setData(json)
      setError(null)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetch_])

  return { data, loading, error, lastUpdated, refresh: fetch_ }
}
