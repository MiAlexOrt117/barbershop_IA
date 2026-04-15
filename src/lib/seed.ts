import { addDays, addMinutes, setHours, setMinutes, subDays } from "date-fns";
import type { BarbershopState, Appointment, Barber, BusinessSettings, CampaignTemplate, Client, Service } from "./types";

function makeId(prefix: string, index: number) {
  return `${prefix}-${index.toString().padStart(3, "0")}`;
}

function combineDate(base: Date, hour: number, minute: number) {
  return setMinutes(setHours(base, hour), minute).toISOString();
}

const services: Service[] = [
  { id: "svc-fade", name: "Fade premium", price: 180, duration: 45, active: true },
  { id: "svc-classic", name: "Corte clásico", price: 150, duration: 30, active: true },
  { id: "svc-beard", name: "Barba y perfilado", price: 120, duration: 25, active: true },
  { id: "svc-package", name: "Combo corte + barba", price: 260, duration: 60, active: true },
  { id: "svc-kid", name: "Corte kids", price: 120, duration: 25, active: true },
  { id: "svc-treatment", name: "Tratamiento capilar", price: 220, duration: 40, active: true }
];

const barbers: Barber[] = [
  { id: "barber-luis", name: "Luis", role: "owner", color: "#72f0c4", active: true },
  { id: "barber-diego", name: "Diego", role: "barber", color: "#7dd3fc", active: true },
  { id: "barber-mateo", name: "Mateo", role: "barber", color: "#fda4af", active: true },
  { id: "barber-sofia", name: "Sofía", role: "barber", color: "#fbbf24", active: true }
];

const settings: BusinessSettings = {
  name: "Barbería Norte",
  phone: "+52 55 1234 5678",
  supportPhone: "+52 55 7777 9090",
  address: "Av. Reforma 120, Ciudad de México",
  currency: "MXN",
  timezone: "America/Mexico_City",
  openingTime: "09:00",
  closingTime: "19:00",
  workingDays: [1, 2, 3, 4, 5, 6]
};

const campaignTemplates: CampaignTemplate[] = [
  {
    id: "tpl-reactivation",
    name: "Reactivación",
    message: "Hola {{name}}, te extrañamos en Barbería Norte. Tenemos un espacio ideal para ti esta semana. ¿Quieres agendar tu corte?"
  },
  {
    id: "tpl-vip",
    name: "VIP",
    message: "Hola {{name}}, como cliente VIP te reservamos prioridad esta semana. Si quieres, te compartimos disponibilidad preferente."
  },
  {
    id: "tpl-noshow",
    name: "No-shows",
    message: "Hola {{name}}, vimos que tuviste algunas inasistencias. Queremos ayudarte a reprogramar en un horario más cómodo."
  }
];

const names = [
  "Carlos Pérez",
  "Andrea Ruiz",
  "Javier Torres",
  "Mónica León",
  "Sebastián Ramírez",
  "Valeria Gómez",
  "Fernando Cruz",
  "Mariana Ortega",
  "Daniel Méndez",
  "Paola Vargas",
  "Ricardo Silva",
  "Camila Ponce",
  "Héctor Muñoz",
  "Elena Castillo",
  "Oscar Ríos",
  "Lucía Herrera",
  "Andrés Campos",
  "Natalia Soto",
  "Sergio Vidal",
  "Diana Flores"
];

const notes = [
  "Corte degradado alto, le gusta hablar de fútbol",
  "Prefiere citas temprano y barba limpia",
  "Siempre pide fade con textura",
  "Cliente VIP, paga puntual",
  "Evitar cambios bruscos de estilo",
  "Quiere recordatorio por WhatsApp",
  "Le gustan cortes clásicos y rápidos",
  "Suele llegar 10 min antes",
  "Interesado en tratamiento capilar",
  "No le gusta esperar"
];

function buildClients(): Client[] {
  return names.map((name, index) => {
    const baseVisits = index % 5 === 0 ? 8 : index % 4 === 0 ? 5 : 2 + (index % 3);
    const totalSpent = baseVisits * (140 + (index % 3) * 35);
    const noShows = index % 6 === 0 ? 2 : index % 4 === 0 ? 1 : 0;
    const lastVisit = index % 7 === 0 ? subDays(new Date(), 42 + index).toISOString() : subDays(new Date(), 4 + index * 2).toISOString();
    const nextVisit = index % 5 === 0 ? addDays(new Date(), 2 + (index % 3)).toISOString() : null;

    return {
      id: makeId("client", index + 1),
      name,
      phone: `+52 55 8${String(1000 + index * 37).slice(1)}`,
      internalNotes: notes[index % notes.length],
      vip: index % 5 === 0 || index % 11 === 0,
      createdAt: subDays(new Date(), 60 + index * 3).toISOString(),
      lastVisit,
      nextVisit,
      totalSpent,
      visits: baseVisits,
      noShows,
      avgTicket: Math.round(totalSpent / baseVisits),
      frequencyDays: index % 5 === 0 ? 18 : index % 4 === 0 ? 24 : 31 + (index % 3) * 4
    };
  });
}

function buildAppointments(clients: Client[]): Appointment[] {
  const appointments: Appointment[] = [];
  const serviceCycle = ["svc-classic", "svc-fade", "svc-beard", "svc-package", "svc-kid", "svc-treatment"];
  const statusCycle: Appointment["status"][] = ["completed", "completed", "pending", "completed", "cancelled", "no-show", "walk-in"];
  let index = 0;

  for (let dayOffset = -5; dayOffset <= 4; dayOffset += 1) {
    const day = addDays(new Date(), dayOffset);
    const slots = [9, 10, 11, 12, 14, 15, 17];

    slots.forEach((hour, slotIndex) => {
      const client = clients[(index + slotIndex) % clients.length];
      const serviceId = serviceCycle[(index + slotIndex) % serviceCycle.length];
      const service = services.find((item) => item.id === serviceId)!;
      const barber = barbers[(index + slotIndex) % barbers.length];
      const start = combineDate(day, hour, slotIndex % 2 === 0 ? 0 : 30);
      const end = addMinutes(new Date(start), service.duration).toISOString();
      const status = statusCycle[(index + slotIndex + dayOffset + 20) % statusCycle.length];
      const paymentStatus = status === "cancelled" || status === "pending" ? "pending" : "paid";
      const createdAt = subDays(new Date(start), 1).toISOString();

      appointments.push({
        id: makeId("appt", appointments.length + 1),
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        serviceId: service.id,
        serviceName: service.name,
        barberId: barber.id,
        barberName: barber.name,
        start,
        end,
        status,
        paymentStatus,
        amount: service.price,
        notes: status === "walk-in" ? "Llegó sin cita" : "",
        source: status === "walk-in" ? "walk-in" : "scheduled",
        createdAt,
        updatedAt: createdAt,
        googleEventId: null,
        provider: "local",
        syncStatus: "pending",
        cancellable: status === "pending" || status === "walk-in",
        statusHistory: [
          {
            status,
            timestamp: createdAt,
            reason: status === "walk-in" ? "Walk-in customer" : "Scheduled appointment"
          }
        ]
      });
    });

    index += 1;
  }

  const today = new Date();
  const todaySlots = [9, 10, 11, 12, 14, 16];
  todaySlots.forEach((hour, slotIndex) => {
    const client = clients[(slotIndex + 3) % clients.length];
    const service = services[slotIndex % services.length];
    const barber = barbers[slotIndex % barbers.length];
    const start = combineDate(today, hour, slotIndex % 2 === 0 ? 0 : 30);
    const end = addMinutes(new Date(start), service.duration).toISOString();
    const status = slotIndex < 2 ? "completed" : slotIndex === 2 ? "pending" : slotIndex === 3 ? "walk-in" : slotIndex === 4 ? "no-show" : "pending";
    const createdAt = subDays(new Date(start), 2).toISOString();

    appointments.push({
      id: makeId("appt", appointments.length + 1),
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      serviceId: service.id,
      serviceName: service.name,
      barberId: barber.id,
      barberName: barber.name,
      start,
      end,
      status,
      paymentStatus: slotIndex < 2 ? "paid" : "pending",
      amount: service.price,
      notes: slotIndex === 4 ? "Reagendar con confirmación" : "",
      source: slotIndex === 3 ? "walk-in" : "scheduled",
      createdAt,
      updatedAt: createdAt,
      googleEventId: null,
      provider: "local",
      syncStatus: "pending",
      cancellable: true,
      statusHistory: [
        {
          status,
          timestamp: createdAt,
          reason: status === "walk-in" ? "Walk-in customer" : "Scheduled appointment"
        }
      ]
    });
  });

  const blockedStart = combineDate(today, 18, 0);
  const blockedEnd = combineDate(today, 19, 0);
  const blockedCreatedAt = new Date().toISOString();

  appointments.push({
    id: makeId("appt", appointments.length + 1),
    clientId: null,
    clientName: "Agenda cerrada por contingencia",
    clientPhone: "",
    serviceId: null,
    serviceName: "Bloqueo",
    barberId: null,
    barberName: "Todos",
    start: blockedStart,
    end: blockedEnd,
    status: "blocked",
    paymentStatus: "pending",
    amount: 0,
    notes: "Bloqueo operativo",
    source: "blocked",
    createdAt: blockedCreatedAt,
    updatedAt: blockedCreatedAt,
    googleEventId: null,
    provider: "local",
    syncStatus: "pending",
    cancellable: false,
    statusHistory: [
      {
        status: "blocked",
        timestamp: blockedCreatedAt,
        reason: "Emergency closure"
      }
    ]
  });

  return appointments;
}

export function createSeedState(): BarbershopState {
  const clients = buildClients();
  const appointments = buildAppointments(clients);

  return {
    role: "owner",
    settings,
    services,
    barbers,
    clients,
    appointments,
    campaignTemplates
  };
}
