export type DbAppointmentStatus = "pending" | "completed" | "cancelled" | "no-show" | "walk-in" | "blocked";
export type DbPaymentStatus = "pending" | "paid";
export type DbSyncStatus = "pending" | "synced" | "failed" | "conflict";

export interface DbBarberRow {
  id: string;
  name: string;
  role: "owner" | "barber";
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbServiceRow {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbClientRow {
  id: string;
  name: string;
  phone: string;
  internal_notes: string;
  vip: boolean;
  last_visit_at: string | null;
  next_visit_at: string | null;
  total_spent: number;
  visits: number;
  no_shows: number;
  avg_ticket: number;
  frequency_days: number;
  created_at: string;
  updated_at: string;
}

export interface DbAppointmentRow {
  id: string;
  client_id: string | null;
  service_id: string | null;
  barber_id: string | null;
  start_at: string;
  end_at: string;
  status: DbAppointmentStatus;
  source: "scheduled" | "walk-in" | "blocked";
  payment_status: DbPaymentStatus;
  amount: number;
  google_event_id: string | null;
  provider: "local" | "google";
  sync_status: DbSyncStatus;
  sync_error: string | null;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface DbAppointmentStatusHistoryRow {
  id: string;
  appointment_id: string;
  status: DbAppointmentStatus;
  reason: string | null;
  created_at: string;
}

export interface DbWebhookDeliveryRow {
  id: string;
  event_id: string;
  event_type: string;
  webhook_url: string;
  status: "pending" | "delivered" | "failed" | "retrying";
  status_code: number | null;
  error: string | null;
  attempts: number;
  last_attempt_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface DbCalendarConnectionRow {
  id: string;
  provider: "google";
  calendar_id: string;
  refresh_token_encrypted: string;
  access_token_encrypted: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
