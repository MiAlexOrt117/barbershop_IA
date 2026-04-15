import { addMinutes, endOfDay, format, isSameDay, parseISO } from "date-fns";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Appointment, AppointmentInput, BarbershopState, Client, ClientInput, Service } from "./types";
import { createSeedState } from "./seed";
import { getServiceById } from "./metrics";

function buildEndTime(start: string, duration: number) {
  return addMinutes(new Date(start), duration).toISOString();
}

/**
 * Check if an appointment conflicts with existing appointments for the SAME BARBER
 * This is critical for multibarber: barberos can work simultaneously
 */
function hasConflictForBarber(appointments: Appointment[], barberId: string | null, start: string, end: string) {
  if (!barberId) return false; // No barber assigned, no conflict

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  return appointments.some((appointment) => {
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

export interface BarbershopActions {
  setRole: (role: BarbershopState["role"]) => void;
  updateSettings: (partial: Partial<BarbershopState["settings"]>) => void;
  upsertService: (service: Service) => void;
  removeService: (serviceId: string) => void;
  upsertClient: (client: ClientInput) => Client;
  createAppointment: (input: AppointmentInput) => Appointment | null;
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
          provider: "local",
          syncStatus: "pending",
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
        return appointment;
      },
      markCompleted: (appointmentId) =>
        set((state) => ({
          appointments: state.appointments.map((appointment) =>
            appointment.id === appointmentId
              ? {
                  ...appointment,
                  status: "completed",
                  completedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  statusHistory: [
                    ...(appointment.statusHistory ?? []),
                    { status: "completed", timestamp: new Date().toISOString(), reason: "Marked as completed" }
                  ]
                }
              : appointment
          )
        })),
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
      cancelAppointment: (appointmentId) =>
        set((state) => ({
          appointments: state.appointments.map((appointment) =>
            appointment.id === appointmentId
              ? {
                  ...appointment,
                  status: "cancelled",
                  cancelledAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  paymentStatus: "pending",
                  statusHistory: [
                    ...(appointment.statusHistory ?? []),
                    { status: "cancelled", timestamp: new Date().toISOString(), reason: "Cancelled by user" }
                  ]
                }
              : appointment
          )
        })),
      markNoShow: (appointmentId) =>
        set((state) => ({
          appointments: state.appointments.map((appointment) =>
            appointment.id === appointmentId
              ? {
                  ...appointment,
                  status: "no-show",
                  updatedAt: new Date().toISOString(),
                  statusHistory: [
                    ...(appointment.statusHistory ?? []),
                    { status: "no-show", timestamp: new Date().toISOString(), reason: "Client did not show up" }
                  ]
                }
              : appointment
          ),
          clients: state.clients.map((client) => {
            const matched = state.appointments.find((appointment) => appointment.id === appointmentId && appointment.clientId === client.id);
            return matched ? { ...client, noShows: client.noShows + 1 } : client;
          })
        })),
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
          provider: "local",
          syncStatus: "pending",
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