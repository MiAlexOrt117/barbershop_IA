import type { Appointment } from "./types";

/**
 * Domain Events - Business events that trigger integrations (Make, Google Calendar, WhatsApp, etc.)
 */

export type DomainEventType =
  | "appointment.created"
  | "appointment.updated"
  | "appointment.completed"
  | "appointment.cancelled"
  | "appointment.no_show"
  | "appointment.blocked"
  | "appointment.rescheduled"
  | "walkin.created"
  | "client.created"
  | "client.updated"
  | "payment.confirmed"
  | "payment.pending"
  | "calendar.sync_started"
  | "calendar.sync_completed"
  | "calendar.sync_failed";

export const DOMAIN_EVENT_TYPES: DomainEventType[] = [
  "appointment.created",
  "appointment.updated",
  "appointment.completed",
  "appointment.cancelled",
  "appointment.no_show",
  "appointment.blocked",
  "appointment.rescheduled",
  "walkin.created",
  "client.created",
  "client.updated",
  "payment.confirmed",
  "payment.pending",
  "calendar.sync_started",
  "calendar.sync_completed",
  "calendar.sync_failed"
];

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  timestamp: string;
  aggregateId: string;
  aggregateType: "appointment" | "client" | "payment" | "calendar";
  data: Record<string, unknown>;
  metadata?: {
    userId?: string;
    source?: "local" | "google_calendar" | "make" | "whatsapp";
    idempotencyKey?: string;
  };
}

export interface IDomainEventHandler {
  handle(event: DomainEvent): Promise<void> | void;
}

export interface IDomainEventBus {
  subscribe(eventType: DomainEventType, handler: IDomainEventHandler): void;
  publish(event: DomainEvent): Promise<void>;
}

export class InMemoryDomainEventBus implements IDomainEventBus {
  private handlers = new Map<DomainEventType, IDomainEventHandler[]>();

  subscribe(eventType: DomainEventType, handler: IDomainEventHandler): void {
    const current = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...current, handler]);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(handlers.map((handler) => handler.handle(event)));
  }
}

function eventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildAppointmentEventData(appointment: Appointment, reason?: string) {
  return {
    appointment: {
      id: appointment.id,
      serviceId: appointment.serviceId,
      serviceName: appointment.serviceName,
      start: appointment.start,
      end: appointment.end,
      amount: appointment.amount,
      source: appointment.source,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      googleEventId: appointment.googleEventId ?? null,
      syncStatus: appointment.syncStatus ?? "pending",
      syncError: appointment.syncError ?? null,
      notes: appointment.notes
    },
    customer: {
      id: appointment.clientId,
      name: appointment.clientName,
      phone: appointment.clientPhone
    },
    barber: {
      id: appointment.barberId,
      name: appointment.barberName
    },
    timestamps: {
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt ?? appointment.createdAt,
      completedAt: appointment.completedAt ?? null,
      cancelledAt: appointment.cancelledAt ?? null
    },
    status: appointment.status,
    reason: reason ?? null
  };
}

function createAppointmentDomainEvent(
  type: Extract<
    DomainEventType,
    "appointment.created" | "appointment.updated" | "appointment.completed" | "appointment.cancelled" | "appointment.no_show" | "appointment.blocked" | "walkin.created"
  >,
  appointment: Appointment,
  options?: { reason?: string; source?: NonNullable<DomainEvent["metadata"]>["source"] }
): DomainEvent {
  return {
    id: eventId(),
    type,
    timestamp: new Date().toISOString(),
    aggregateId: appointment.id,
    aggregateType: "appointment",
    data: buildAppointmentEventData(appointment, options?.reason),
    metadata: {
      source: options?.source ?? "local",
      idempotencyKey: `${type}:${appointment.id}:${appointment.updatedAt ?? appointment.createdAt}`
    }
  };
}

export function createAppointmentCreatedEvent(appointment: Appointment) {
  return createAppointmentDomainEvent("appointment.created", appointment);
}

export function createAppointmentUpdatedEvent(appointment: Appointment, reason = "Schedule updated") {
  return createAppointmentDomainEvent("appointment.updated", appointment, { reason });
}

export function createAppointmentCompletedEvent(appointment: Appointment) {
  return createAppointmentDomainEvent("appointment.completed", appointment, { reason: "Marked as completed" });
}

export function createAppointmentCancelledEvent(appointment: Appointment) {
  return createAppointmentDomainEvent("appointment.cancelled", appointment, { reason: "Cancelled by operator" });
}

export function createNoShowEvent(appointment: Appointment) {
  return createAppointmentDomainEvent("appointment.no_show", appointment, { reason: "Client did not show up" });
}

export function createAppointmentBlockedEvent(appointment: Appointment) {
  return createAppointmentDomainEvent("appointment.blocked", appointment, { reason: appointment.notes || "Agenda blocked" });
}

export function createWalkInCreatedEvent(appointment: Appointment) {
  return createAppointmentDomainEvent("walkin.created", appointment, { reason: "Walk-in registered" });
}
