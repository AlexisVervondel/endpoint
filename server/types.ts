export type VisitReason = 'Meeting' | 'Delivery' | 'Interview' | 'Training' | 'Other';

export const VISIT_REASONS: VisitReason[] = ['Meeting', 'Delivery', 'Interview', 'Training', 'Other'];

export interface Visit {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reason: VisitReason;
  person_to_meet: string | null;
  signed_in_at: string;   // 'YYYY-MM-DD HH:MM:SS' UTC
  signed_out_at: string | null;
  reminder_sent: number;  // 0 | 1
}

export interface CreateVisitInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reason: VisitReason;
  person_to_meet?: string;
}

export interface Employee {
  displayName: string;
  mail: string;
}
