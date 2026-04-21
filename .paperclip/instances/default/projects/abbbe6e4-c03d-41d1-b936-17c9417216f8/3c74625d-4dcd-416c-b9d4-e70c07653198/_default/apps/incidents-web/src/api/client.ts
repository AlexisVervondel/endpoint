const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as any).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  incidents: {
    list: (params?: { status?: string; severity?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString()
      return request<any[]>(`/incidents${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => request<any>(`/incidents/${id}`),
    create: (body: object) => request<any>('/incidents', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: object) =>
      request<any>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  timeline: {
    list: (id: string) => request<any[]>(`/incidents/${id}/timeline`),
    add: (id: string, body: object) =>
      request<any>(`/incidents/${id}/timeline`, { method: 'POST', body: JSON.stringify(body) }),
  },
  postmortems: {
    get: (id: string) => request<any>(`/incidents/${id}/postmortem`),
    create: (id: string, body: object) =>
      request<any>(`/incidents/${id}/postmortem`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: object) =>
      request<any>(`/incidents/${id}/postmortem`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  reports: {
    mttr: (params?: object) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString()
      return request<any>(`/reports/mttr${qs ? `?${qs}` : ''}`)
    },
    sla: (params?: object) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString()
      return request<any>(`/reports/sla${qs ? `?${qs}` : ''}`)
    },
  },
}
