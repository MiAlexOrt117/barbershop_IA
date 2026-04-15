/**
 * Domain Events - Business events that trigger integrations (Make, Google Calendar, WhatsApp, etc.)
 * This is the foundation for event-driven architecture
 */

export type DomainEventType =
  // Appointment events
  | "appointment.created"
  | "appointment.updated"
  | "appointment.completed"
  | "appointment.cancelled"
  | "appointment.no_show"
  | "appointment.blocked"
  | "appointment.rescheduled"
  // Walk-in events
  | "walkin.created"
  // Client events
  | "client.created"
  | "client.updated"
  // Payment events
  | "payment.confirmed"
  | "payment.pending"
  // Synchronization events
  | "calendar.sync_started"
  | "calendar.sync_completed"
  | "calendar.sync_failed";

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  timestamp: string;
  aggregateId: string; // appointment.id, client.id, etc
  aggregateType: "appointment" | "client" | "payment" | "calendar";
  data: Record<string, unknown>;
  metadata?: {
    userId?: string;
    source?: "local" | "google_calendar" | "make" | "whatsapp";
    idempotencyKey?: string;
  };
}

/**
 * Domain Event Emitter
 * Singleton for publishing events that get consumed by integrations
 */
export interface IDomainEventHandler {
  handle(event: DomainEvent): Promise<void> | void;
}

export interface IDomainEventBus {
  subscribe(eventType: DomainEventType, handler: IDomainEventHandler): void;
  publish(event: DomainEvent): Promise<void>;
}

/**
 * Sample event payloads for Make integration
 */

export function createAppointmentCreatedEvent(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  start: string;
  end: string;
  amount: number;
  createdBy?: string;
}): DomainEvent {
  return {
    id: `evt-${Date.now()}`,
    type: "appointment.created",
    timestamp: new Date().toISOString(),
    aggregateId: data.appointmentId,
    aggregateType: "appointment",
    data,
    metadata: {
      source: "local",
      idempotencyKey: data.appointmentId
    }
  };
}

export function createPaymentConfirmedEvent(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  amount: number;
  paymentMethod?: string;
}): DomainEvent {
  return {
    id: `evt-${Date.now()}`,
    type: "payment.confirmed",
    timestamp: new Date().toISOString(),
    aggregateId: data.appointmentId,
    aggregateType: "payment",
    data,
    metadata: {
      source: "local",
      idempotencyKey: `payment-${data.appointmentId}`
    }
  };
}

export function createAppointmentCompletedEvent(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  barberId: string;
  barberName: string;
  serviceName: string;
  amount: number;
  completedAt: string;
}): DomainEvent {
  return {
    id: `evt-${Date.now()}`,
    type: "appointment.completed",
    timestamp: new Date().toISOString(),
    aggregateId: data.appointmentId,
    aggregateType: "appointment",
    data,
    metadata: {
      source: "local",
      idempotencyKey: data.appointmentId
    }
  };
}

export function createAppointmentCancelledEvent(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  reason?: string;
  cancelledAt: string;
}): DomainEvent {
  return {
    id: `evt-${Date.now()}`,
    type: "appointment.cancelled",
    timestamp: new Date().toISOString(),
    aggregateId: data.appointmentId,
    aggregateType: "appointment",
    data,
    metadata: {
      source: "local",
      idempotencyKey: data.appointmentId
    }
  };
}

export function createNoShowEvent(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  noShowCount: number;
}): DomainEvent {
  return {
    id: `evt-${Date.now()}`,
    type: "appointment.no_show",
    timestamp: new Date().toISOString(),
    aggregateId: data.appointmentId,
    aggregateType: "appointment",
    data,
    metadata: {
      source: "local",
      idempotencyKey: data.appointmentId
    }
  };
}

export function createClientCreatedEvent(data: {
  clientId: string;
  clientName: string;
  clientPhone: string;
  vip: boolean;
}): DomainEvent {
  return {
    id: `evt-${Date.now()}`,
    type: "client.created",
    timestamp: new Date().toISOString(),
    aggregateId: data.clientId,
    aggregateType: "client",
    data,
    metadata: {
      source: "local",
      idempotencyKey: data.clientId
    }
  };
}
