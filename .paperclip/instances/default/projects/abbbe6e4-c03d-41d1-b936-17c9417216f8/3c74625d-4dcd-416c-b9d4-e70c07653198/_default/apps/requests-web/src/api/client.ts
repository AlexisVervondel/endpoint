import type {
  ItRequest,
  RequestComment,
  RequestStats,
  CreateRequestBody,
  UpdateRequestBody,
  ApproveRequestBody,
  RejectRequestBody,
  CompleteRequestBody,
  AddCommentBody,
} from '@its/shared'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as Record<string, string>)['error'] ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  requests: {
    list: (params?: { status?: string; category?: string; requesterId?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString()
      return request<ItRequest[]>(`/requests${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => request<ItRequest>(`/requests/${id}`),
    create: (body: CreateRequestBody) =>
      request<ItRequest>('/requests', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: UpdateRequestBody) =>
      request<ItRequest>(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    approve: (id: string, body: ApproveRequestBody) =>
      request<ItRequest>(`/requests/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
    reject: (id: string, body: RejectRequestBody) =>
      request<ItRequest>(`/requests/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),
    start: (id: string) =>
      request<ItRequest>(`/requests/${id}/start`, { method: 'POST', body: '{}' }),
    complete: (id: string, body: CompleteRequestBody) =>
      request<ItRequest>(`/requests/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
    cancel: (id: string) =>
      request<ItRequest>(`/requests/${id}/cancel`, { method: 'POST', body: '{}' }),
    stats: () => request<RequestStats>('/requests/stats'),
  },
  comments: {
    list: (requestId: string, internal = false) =>
      request<RequestComment[]>(`/requests/${requestId}/comments${internal ? '?internal=true' : ''}`),
    add: (requestId: string, body: AddCommentBody) =>
      request<RequestComment>(`/requests/${requestId}/comments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
}
