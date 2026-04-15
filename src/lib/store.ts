import { addMinutes, endOfDay, format, isSameDay, parseISO } from "date-fns";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Appointment, AppointmentInput, AppointmentUpdateInput, BarbershopState, Client, ClientInput, Service } from "./types";
import { createSeedState } from "./seed";
import { publishDomainEvent } from "./domain-event-client";
import {
  createAppointmentBlockedEvent,
  createAppointmentCancelledEvent,
  createAppointmentCompletedEvent,
  createAppointmentCreatedEvent,
  createAppointmentUpdatedEvent,
  createNoShowEvent,
  createWalkInCreatedEvent
} from "./domain-events";
import { syncAppointmentWithCalendar } from "./integration-client";
import { getServiceById } from "./metrics";

type StoreState = BarbershopState & BarbershopActions;
type StoreSetter = (
  partial:
    | Partial<StoreState>
    | ((state: StoreState) => Partial<StoreState>)
) => void;

function buildEndTime(start: string, duration: number) {
  return addMinutes(new Date(start), duration).toISOString();
}

/**
 * Check if an appointment conflicts with existing appointments for the SAME BARBER
 * This is critical for multibarber: barberos can work simultaneously
 */
function hasConflictForBarber(appointments: Appointment[], barberId: string | null, start: string, end: string, ignoredAppointmentId?: string) {
  if (!barberId) return false; // No barber assigned, no conflict

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  return appointments.some((appointment) => {
    if (ignoredAppointmentId && appointment.id === ignoredAppointmentId) return false;
    // Only check conflicts with same barber
    if (appointment.barberId !== barberId) return false;
    // Cancelled appointments don't block slots
    if (appointment.status === "cancelled") return false;

    const existingStart = new Date(appointment.start).getTime();
    const existingEnd = new Date(appointment.end).getTime();

    // Check for conflict: new appointment overlaps with existing
    return startTime < existingEnd && endTime > existingStart;
  });
}

function formatDayKey(value: string) {
  return format(parseISO(value), "yyyy-MM-dd");
}

function isAgendaClosed(appointments: Appointment[], start: string) {
  return appointments.some((appointment) => appointment.source === "blocked" && formatDayKey(appointment.start) === formatDayKey(start) && new Date(start).getTime() >= new Date(appointment.start).getTime());
}

function applyCalendarSyncResult(
  set: StoreSetter,
  appointmentId: string,
  result: {
    success: boolean;
    provider: "local" | "google";
    googleEventId?: string | null;
    externalEventId?: string;
    error?: string;
  }
) {
  set((state) => ({
    appointments: state.appointments.map((appointment) =>
      appointment.id === appointmentId
        ? {
            ...appointment,
            provider: result.provider,
            googleEventId: result.googleEventId ?? appointment.googleEventId ?? null,
            externalEventId: result.externalEventId ?? result.googleEventId ?? appointment.externalEventId,
            syncStatus: result.success ? "synced" : "failed",
            syncError: result.success ? undefined : result.error
          }
        : appointment
    )
  }));
}

function syncAppointmentLifecycle(
  set: StoreSetter,
  get: () => StoreState,
  action: "create" | "update" | "cancel",
  appointment: Appointment
) {
  if (typeof window === "undefined") {
    return;
  }

  void syncAppointmentWithCalendar({
    action,
    appointment,
    settings: {
      name: get().settings.name,
      address: get().settings.address,
      timezone: get().settings.timezone
    }
  })
    .then((result) => {
      applyCalendarSyncResult(set, appointment.id, result);
    })
    .catch((error) => {
      applyCalendarSyncResult(set, appointment.id, {
        success: false,
        provider: appointment.provider ?? "local",
        googleEventId: appointment.googleEventId ?? null,
        externalEventId: appointment.externalEventId,
        error: error instanceof Error ? error.message : "Calendar sync failed"
      });
    });
}

function emitDomainEvent(event: ReturnType<typeof createAppointmentCreatedEvent>) {
  if (typeof window === "undefined") {
    return;
  }

  void publishDomainEvent(event).catch(() => {
    return;
  });
}

export interface BarbershopActions {
  setRole: (role: BarbershopState["role"]) => void;
  updateSettings: (partial: Partial<BarbershopState["settings"]>) => void;
  upsertService: (service: Service) => void;
  removeService: (serviceId: string) => void;
  upsertClient: (client: ClientInput) => Client;
  createAppointment: (input: AppointmentInput) => Appointment | null;
  updateAppointment: (appointmentId: string, input: AppointmentUpdateInput) => Appointment | null;
  markCompleted: (appointmentId: string) => void;
  markPaid: (appointmentId: string) => void;
  cancelAppointment: (appointmentId: string) => void;
  markNoShow: (appointmentId: string) => void;
  closeAgendaForDay: (dayIso: string) => void;
  createWalkIn: (input: Omit<AppointmentInput, "walkIn">) => Appointment | null;
}

export const useBarbershopStore = create<BarbershopState & BarbershopActions>()(
  persist(
    (set, get) => ({
      ...createSeedState(),
      setRole: (role) => set({ role }),
      updateSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),
      upsertService: (service) =>
        set((state) => {
          const exists = state.services.some((item) => item.id === service.id);
          return { services: exists ? state.services.map((item) => (item.id === service.id ? service : item)) : [service, ...state.services] };
        }),
      removeService: (serviceId) => set((state) => ({ services: state.services.filter((service) => service.id !== serviceId) })),
      upsertClient: (clientInput) => {
        let result: Client | null = null;
        set((state) => {
          const clientId = clientInput.id ?? `client-${Date.now()}`;
          const existing = state.clients.find((client) => client.id === clientId);
          const client: Client = {
            id: clientId,
            name: clientInput.name,
            phone: clientInput.phone,
            internalNotes: clientInput.internalNotes,
            vip: clientInput.vip,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            lastVisit: existing?.lastVisit ?? null,
            nextVisit: existing?.nextVisit ?? null,
            totalSpent: existing?.totalSpent ?? 0,
            visits: existing?.visits ?? 0,
            noShows: existing?.noShows ?? 0,
            avgTicket: existing?.avgTicket ?? 0,
            frequencyDays: existing?.frequencyDays ?? 30
          };
          result = client;
          return { clients: existing ? state.clients.map((item) => (item.id === client.id ? client : item)) : [client, ...state.clients] };
        });
        return result!;
      },
      createAppointment: (input) => {
        const state = get();
        const service = getServiceById(state.services, input.serviceId);
        if (!service) return null;

        const end = buildEndTime(input.start, service.duration);

        // Check conflict only for the specific barber assigned
        if (hasConflictForBarber(state.appointments, input.barberId, input.start, end) || isAgendaClosed(state.appointments, input.start)) {
          return null;
        }

        const barber = state.barbers.find((item) => item.id === input.barberId) ?? null;
        const clientName = input.clientName.trim();
        const clientPhone = input.clientPhone.trim();
        let clientId = input.clientId ?? null;

        if (!clientId && clientName) {
          const client = get().upsertClient({ name: clientName, phone: clientPhone, internalNotes: input.notes ?? "", vip: false });
          clientId = client.id;
        }

        const now = new Date().toISOString();
        const appointment: Appointment = {
          id: `appt-${Date.now()}`,
          clientId,
          clientName,
          clientPhone,
          serviceId: service.id,
          serviceName: service.name,
          barberId: barber?.id ?? null,
          barberName: barber?.name ?? "Sin asignar",
          start: input.start,
          end,
          status: input.walkIn ? "walk-in" : "pending",
          paymentStatus: "pending",
          amount: service.price,
          notes: input.notes ?? "",
          source: input.walkIn ? "walk-in" : "scheduled",
          createdAt: now,
          createdBy: input.createdBy,
          updatedAt: now,
          googleEventId: null,
          provider: "local",
          syncStatus: "pending",
          syncError: undefined,
          cancellable: true,
          statusHistory: [
            {
              status: input.walkIn ? "walk-in" : "pending",
              timestamp: now,
              reason: "Created"
            }
          ]
        };

        set((state) => ({ appointments: [appointment, ...state.appointments] }));
        syncAppointmentLifecycle(set, get, "create", appointment);
        emitDomainEvent(input.walkIn ? createWalkInCreatedEvent(appointment) : createAppointmentCreatedEvent(appointment));
        return appointment;
      },
      updateAppointment: (appointmentId, input) => {
        const state = get();
        const current = state.appointments.find((appointment) => appointment.id === appointmentId);
        if (!current) return null;

        const service = getServiceById(state.services, input.serviceId);
        if (!service) return null;

        const end = buildEndTime(input.start, service.duration);

        if (
          hasConflictForBarber(state.appointments, input.barberId, input.start, end, appointmentId) ||
          (current.status !== "blocked" && isAgendaClosed(state.appointments, input.start))
        ) {
          return null;
        }

        const barber = state.barbers.find((item) => item.id === input.barberId) ?? null;
        const now = new Date().toISOString();
        const updated: Appointment = {
          ...current,
          clientName: input.clientName.trim(),
          clientPhone: input.clientPhone.trim(),
          serviceId: service.id,
          serviceName: service.name,
          barberId: barber?.id ?? null,
          barberName: barber?.name ?? "Sin asignar",
          start: input.start,
          end,
          amount: service.price,
          notes: input.notes ?? "",
          updatedAt: now,
          syncStatus: "pending",
          syncError: undefined,
          statusHistory: [
            ...(current.statusHistory ?? []),
            {
              status: current.status,
              timestamp: now,
              reason: "Updated from schedule"
            }
          ]
        };

        if (updated.clientId) {
          const existingClient = state.clients.find((client) => client.id === updated.clientId);
          if (existingClient) {
            get().upsertClient({
              id: existingClient.id,
              name: updated.clientName,
              phone: updated.clientPhone,
              internalNotes: existingClient.internalNotes,
              vip: existingClient.vip
            });
          }
        }

        set((store) => ({
          appointments: store.appointments.map((appointment) => (appointment.id === appointmentId ? updated : appointment))
        }));
        syncAppointmentLifecycle(set, get, "update", updated);
        emitDomainEvent(createAppointmentUpdatedEvent(updated));
        return updated;
      },
      markCompleted: (appointmentId) => {
        const state = get();
        const current = state.appointments.find((appointment) => appointment.id === appointmentId);
        if (!current) return;

        const now = new Date().toISOString();
        const updated: Appointment = {
          ...current,
          status: "completed",
          completedAt: now,
          updatedAt: now,
          syncStatus: "pending",
          syncError: undefined,
          statusHistory: [...(current.statusHistory ?? []), { status: "completed", timestamp: now, reason: "Marked as completed" }]
        };

        set((store) => ({
          appointments: store.appointments.map((appointment) => (appointment.id === appointmentId ? updated : appointment))
        }));
        syncAppointmentLifecycle(set, get, "update", updated);
        emitDomainEvent(createAppointmentCompletedEvent(updated));
      },
      markPaid: (appointmentId) =>
        set((state) => ({
          appointments: state.appointments.map((appointment) =>
            appointment.id === appointmentId
              ? {
                  ...appointment,
                  paymentStatus: "paid",
                  updatedAt: new Date().toISOString()
                }
              : appointment
          )
        })),
      cancelAppointment: (appointmentId) => {
        const state = get();
        const current = state.appointments.find((appointment) => appointment.id === appointmentId);
        if (!current) return;

        const now = new Date().toISOString();
        const updated: Appointment = {
          ...current,
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
          paymentStatus: "pending",
          syncStatus: "pending",
          syncError: undefined,
          statusHistory: [...(current.statusHistory ?? []), { status: "cancelled", timestamp: now, reason: "Cancelled by user" }]
        };

        set((store) => ({
          appointments: store.appointments.map((appointment) => (appointment.id === appointmentId ? updated : appointment))
        }));
        syncAppointmentLifecycle(set, get, "cancel", updated);
        emitDomainEvent(createAppointmentCancelledEvent(updated));
      },
      markNoShow: (appointmentId) => {
        const state = get();
        const current = state.appointments.find((appointment) => appointment.id === appointmentId);
        if (!current) return;

        const now = new Date().toISOString();
        const updated: Appointment = {
          ...current,
          status: "no-show",
          updatedAt: now,
          syncStatus: "pending",
          syncError: undefined,
          statusHistory: [...(current.statusHistory ?? []), { status: "no-show", timestamp: now, reason: "Client did not show up" }]
        };

        set((store) => ({
          appointments: store.appointments.map((appointment) => (appointment.id === appointmentId ? updated : appointment)),
          clients: store.clients.map((client) => (current.clientId === client.id ? { ...client, noShows: client.noShows + 1 } : client))
        }));
        syncAppointmentLifecycle(set, get, "update", updated);
        emitDomainEvent(createNoShowEvent(updated));
      },
      closeAgendaForDay: (dayIso) => {
        const state = get();
        const day = parseISO(dayIso);
        const blockedStart = new Date(day);
        const now = new Date().toISOString();
        const appointment: Appointment = {
          id: `blocked-${Date.now()}`,
          clientId: null,
          clientName: "Agenda cerrada por contingencia",
          clientPhone: "",
          serviceId: null,
          serviceName: "Agenda cerrada",
          barberId: null,
          barberName: "Todos",
          start: blockedStart.toISOString(),
          end: endOfDay(day).toISOString(),
          status: "blocked",
          paymentStatus: "pending",
          amount: 0,
          notes: "Bloqueado por emergencia",
          source: "blocked",
          createdAt: now,
          updatedAt: now,
          googleEventId: null,
          provider: "local",
          syncStatus: "pending",
          syncError: undefined,
          cancellable: false,
          statusHistory: [
            {
              status: "blocked",
              timestamp: now,
              reason: "Emergency closure"
            }
          ]
        };

        set({ appointments: [appointment, ...state.appointments.filter((item) => !isSameDay(parseISO(item.start), day) || item.status === "completed" || item.status === "cancelled")] });
        syncAppointmentLifecycle(set, get, "create", appointment);
        emitDomainEvent(createAppointmentBlockedEvent(appointment));
      },
      createWalkIn: (input) => get().createAppointment({ ...input, walkIn: true })
    }),
    {
      name: "barbershop-mvp",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        role: state.role,
        settings: state.settings,
        services: state.services,
        barbers: state.barbers,
        clients: state.clients,
        appointments: state.appointments,
        campaignTemplates: state.campaignTemplates
      })
    }
  )
);
