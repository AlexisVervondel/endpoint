import type { RequestStatus, RequestCategory, RequestPriority } from '@its/shared'

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`badge badge-status-${status}`}>{status.replace('_', ' ')}</span>
}

export function CategoryBadge({ category }: { category: RequestCategory }) {
  const label: Record<RequestCategory, string> = {
    hardware: 'Hardware',
    software_license: 'Software',
    access: 'Access',
    infra: 'Infra',
  }
  return <span className={`badge badge-cat-${category}`}>{label[category]}</span>
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return <span className={`badge badge-pri-${priority}`}>{priority}</span>
}
