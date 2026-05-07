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
  signed_in_at: string;
  signed_out_at: string | null;
  reminder_sent: number;
}

export interface Employee {
  displayName: string;
  mail: string;
}

export interface SignInFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reason: VisitReason | '';
  person_to_meet: string;
}
