import { useState, useEffect, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { StatusBadge, CategoryBadge, PriorityBadge } from '../components/StatusBadge.js'
import type { ItRequest, RequestComment } from '@its/shared'

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [req, setReq] = useState<ItRequest | null>(null)
  const [comments, setComments] = useState<RequestComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actorId, setActorId] = useState('')
  const [commentText, setCommentText] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [busy, setBusy] = useState(false)

  const loadData = async () => {
    if (!id) return
    const [r, c] = await Promise.all([api.requests.get(id), api.comments.list(id, true)])
    setReq(r)
    setComments(c)
  }

  useEffect(() => {
    setLoading(true)
    loadData().catch(() => setError('Failed to load request')).finally(() => setLoading(false))
  }, [id])

  async function act(fn: () => Promise<ItRequest>) {
    setBusy(true)
    setError('')
    try {
      const updated = await fn()
      setReq(updated)
      await loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault()
    if (!id || !commentText.trim()) return
    setBusy(true)
    try {
      const c = await api.comments.add(id, { authorId: actorId || 'user', message: commentText })
      setComments((prev) => [...prev, c])
      setCommentText('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add comment')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page"><div className="empty">Loading…</div></div>
  if (!req) return <div className="page"><div className="empty">Request not found.</div></div>

  const slaDate = new Date(req.slaDueAt)
  const now = new Date()
  const slaPast = now > slaDate && !['completed', 'cancelled', 'rejected'].includes(req.status)

  return (
    <div className="page">
      <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        <Link to="/">← All Requests</Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{req.title}</h1>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="action-bar">
        <div>
          <label style={{ display: 'inline', marginRight: 8 }}>Acting as:</label>
          <input
            style={{ width: 140, display: 'inline-block' }}
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            placeholder="your ID"
          />
        </div>

        {req.status === 'pending' && (
          <>
            <button
              className="btn-success btn-sm"
              disabled={busy || !actorId}
              onClick={() => act(() => api.requests.approve(req.id, { approvedBy: actorId }))}
            >
              Approve
            </button>
            <button
              className="btn-danger btn-sm"
              disabled={busy || !actorId}
              onClick={() => setShowRejectForm(true)}
            >
              Reject
            </button>
          </>
        )}

        {req.status === 'approved' && (
          <button
            className="btn-primary btn-sm"
            disabled={busy}
            onClick={() => act(() => api.requests.start(req.id))}
          >
            Start Fulfillment
          </button>
        )}

        {(req.status === 'approved' || req.status === 'in_progress') && (
          <button
            className="btn-success btn-sm"
            disabled={busy || !actorId}
            onClick={() => act(() => api.requests.complete(req.id, { completedBy: actorId }))}
          >
            Mark Complete
          </button>
        )}

        {!['completed', 'cancelled', 'rejected'].includes(req.status) && (
          <button
            className="btn-secondary btn-sm"
            disabled={busy}
            onClick={() => act(() => api.requests.cancel(req.id))}
          >
            Cancel
          </button>
        )}
      </div>

      {showRejectForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">Reject Request</div>
          <div className="form-grid">
            <div>
              <label>Rejection Reason *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why the request is rejected"
              />
            </div>
            <div className="form-actions">
              <button className="btn-secondary btn-sm" onClick={() => setShowRejectForm(false)}>Cancel</button>
              <button
                className="btn-danger btn-sm"
                disabled={busy || !rejectReason.trim() || !actorId}
                onClick={() => {
                  act(() => api.requests.reject(req.id, { rejectedBy: actorId, rejectionReason: rejectReason }))
                  setShowRejectForm(false)
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div>
          <div className="card">
            <div className="section-title">Description</div>
            <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{req.description}</p>
          </div>

          {req.rejectionReason && (
            <div className="card" style={{ marginTop: 12, borderColor: 'var(--danger)' }}>
              <div className="section-title" style={{ color: 'var(--danger)' }}>Rejection Reason</div>
              <p style={{ fontSize: 13 }}>{req.rejectionReason}</p>
            </div>
          )}

          <div className="card" style={{ marginTop: 12 }}>
            <div className="section-title">Activity</div>
            {comments.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No activity yet.</div>
            ) : (
              <div className="comment-list">
                {comments.map((c) => (
                  <div key={c.id} className={`comment ${c.isInternal ? 'internal' : ''}`}>
                    <div className="comment-header">
                      <span>{c.authorId} {c.isInternal && <span style={{ color: 'var(--accent)', fontSize: 10 }}>internal</span>}</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="comment-body">{c.message}</div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={addComment} style={{ marginTop: 12 }} className="form-grid">
              <div>
                <label>Add Comment</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment…"
                  style={{ minHeight: 60 }}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary btn-sm" disabled={busy || !commentText.trim()}>
                  Comment
                </button>
              </div>
            </form>
          </div>
        </div>

        <div>
          <div className="sidebar-card">
            <div className="sidebar-section">Details</div>
            <div className="field-row">
              <span className="field-label">Status</span>
              <StatusBadge status={req.status} />
            </div>
            <div className="field-row">
              <span className="field-label">Category</span>
              <CategoryBadge category={req.category} />
            </div>
            <div className="field-row">
              <span className="field-label">Priority</span>
              <PriorityBadge priority={req.priority} />
            </div>
            <div className="field-row">
              <span className="field-label">Requester</span>
              <span>{req.requesterEmail}</span>
            </div>
            {req.managerId && (
              <div className="field-row">
                <span className="field-label">Manager</span>
                <span>{req.managerId}</span>
              </div>
            )}
            {req.assigneeId && (
              <div className="field-row">
                <span className="field-label">Assignee</span>
                <span>{req.assigneeId}</span>
              </div>
            )}
          </div>

          <div className="sidebar-card" style={{ marginTop: 12 }}>
            <div className="sidebar-section">SLA</div>
            <div className="field-row">
              <span className="field-label">Due by</span>
              <span>{slaDate.toLocaleDateString()}</span>
            </div>
            <div className="field-row">
              <span className="field-label">SLA Status</span>
              {req.slaBreach ? (
                <span className="sla-breach">Breached</span>
              ) : slaPast ? (
                <span className="sla-breach">Overdue</span>
              ) : (
                <span className="sla-ok">On track</span>
              )}
            </div>
            {req.approvedAt && (
              <div className="field-row">
                <span className="field-label">Approved</span>
                <span>{new Date(req.approvedAt).toLocaleDateString()}</span>
              </div>
            )}
            {req.completedAt && (
              <div className="field-row">
                <span className="field-label">Completed</span>
                <span>{new Date(req.completedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="sidebar-card" style={{ marginTop: 12 }}>
            <div className="sidebar-section">Timestamps</div>
            <div className="field-row">
              <span className="field-label">Created</span>
              <span>{new Date(req.createdAt).toLocaleString()}</span>
            </div>
            <div className="field-row">
              <span className="field-label">Updated</span>
              <span>{new Date(req.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
