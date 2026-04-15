export type Role = "owner" | "employee";

export type AppointmentStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "no-show"
  | "walk-in"
  | "blocked";

export type PaymentStatus = "pending" | "paid";

export interface BusinessSettings {
  name: string;
  phone: string;
  supportPhone: string;
  address: string;
  currency: string;
  timezone: string;
  openingTime: string;
  closingTime: string;
  workingDays: number[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  role: "owner" | "barber";
  color: string;
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  internalNotes: string;
  vip: boolean;
  createdAt: string;
  lastVisit: string | null;
  nextVisit: string | null;
  totalSpent: number;
  visits: number;
  noShows: number;
  avgTicket: number;
  frequencyDays: number;
}

export interface Appointment {
  // Core identity
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  serviceId: string | null;
  serviceName: string;
  barberId: string | null;
  barberName: string;

  // Scheduling
  start: string;
  end: string;
  status: AppointmentStatus;
  source: "scheduled" | "walk-in" | "blocked";

  // Payments
  paymentStatus: PaymentStatus;
  amount: number;

  // Calendar sync (for Google Calendar & external integrations)
  externalEventId?: string; // Google Calendar event ID
  provider?: "local" | "google"; // Where appointment is synced
  syncStatus?: "pending" | "synced" | "failed" | "conflict";
  syncError?: string;

  // Audit trail
  createdAt: string;
  createdBy?: string; // User who created this appointment
  updatedAt?: string;
  completedAt?: string | null;
  cancelledAt?: string | null;

  // Status history for tracking changes
  statusHistory?: Array<{ status: AppointmentStatus; timestamp: string; reason?: string }>;

  // Notes & metadata
  notes: string;
  tags?: string[]; // For segmentation (VIP, urgent, etc)
  cancellable: boolean;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  message: string;
}

export interface BarbershopState {
  role: Role;
  settings: BusinessSettings;
  services: Service[];
  barbers: Barber[];
  clients: Client[];
  appointments: Appointment[];
  campaignTemplates: CampaignTemplate[];
}

export interface AppointmentInput {
  clientId?: string | null;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  barberId: string;
  start: string;
  notes?: string;
  walkIn?: boolean;
  createdBy?: string;
}

export interface ClientInput {
  id?: string;
  name: string;
  phone: string;
  internalNotes: string;
  vip: boolean;
}