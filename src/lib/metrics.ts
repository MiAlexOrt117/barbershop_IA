import { addDays, differenceInDays, eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import type { Appointment, BarbershopState, Client, Service } from "./types";

export function getServiceById(services: Service[], serviceId: string | null) {
  return services.find((service) => service.id === serviceId) ?? null;
}

export function getClientById(clients: Client[], clientId: string | null) {
  if (!clientId) return null;
  return clients.find((client) => client.id === clientId) ?? null;
}

export function getTodayAppointments(appointments: Appointment[]) {
  return appointments
    .filter((appointment) => isSameDay(parseISO(appointment.start), new Date()))
    .sort((left, right) => +new Date(left.start) - +new Date(right.start));
}

export function getNextAppointment(appointments: Appointment[]) {
  const now = Date.now();
  return appointments
    .filter((appointment) => ["pending", "walk-in"].includes(appointment.status) && +new Date(appointment.start) >= now)
    .sort((left, right) => +new Date(left.start) - +new Date(right.start))[0] ?? null;
}

export function getProjectedRevenueForDay(state: BarbershopState, day = new Date()) {
  return state.appointments.reduce((total, appointment) => {
    const date = parseISO(appointment.start);
    const service = getServiceById(state.services, appointment.serviceId);
    const matchesDay = isSameDay(date, day);
    const billable = appointment.status !== "cancelled" && appointment.status !== "blocked";

    return total + (matchesDay && service && billable ? service.price : 0);
  }, 0);
}

export function getConfirmedRevenue(state: BarbershopState) {
  return state.appointments.reduce((total, appointment) => {
    const matches = appointment.status === "completed" || appointment.status === "walk-in";
    return total + (matches && appointment.paymentStatus === "paid" ? appointment.amount : 0);
  }, 0);
}

export function getOccupancyRate(state: BarbershopState, day = new Date()) {
  const openings = state.settings.openingTime.split(":").map(Number);
  const closings = state.settings.closingTime.split(":").map(Number);
  const availableMinutes = closings[0] * 60 + closings[1] - (openings[0] * 60 + openings[1]);
  const bookedMinutes = state.appointments
    .filter((appointment) => isSameDay(parseISO(appointment.start), day) && appointment.status !== "cancelled")
    .reduce((total, appointment) => total + Math.max(0, (new Date(appointment.end).getTime() - new Date(appointment.start).getTime()) / 60000), 0);

  return Math.round((bookedMinutes / Math.max(availableMinutes, 1)) * 100);
}

export function getCompletionRatio(appointments: Appointment[]) {
  const today = getTodayAppointments(appointments).filter((appointment) => appointment.status !== "blocked");
  const completed = today.filter((appointment) => appointment.status === "completed").length;
  return { completed, total: today.length, pending: Math.max(today.length - completed, 0) };
}

export function getTopServices(state: BarbershopState) {
  const counts = state.services.map((service) => ({
    name: service.name,
    count: state.appointments.filter((appointment) => appointment.serviceId === service.id && appointment.status !== "cancelled").length,
    revenue: state.appointments.reduce((total, appointment) => total + (appointment.serviceId === service.id && appointment.status !== "cancelled" ? service.price : 0), 0)
  }));

  return counts.sort((left, right) => right.count - left.count).slice(0, 5);
}

export function getBarberPerformance(state: BarbershopState) {
  return state.barbers.map((barber) => {
    const scheduled = state.appointments.filter((appointment) => appointment.barberId === barber.id && appointment.status !== "cancelled");
    const completed = scheduled.filter((appointment) => appointment.status === "completed" || appointment.status === "walk-in").length;
    const revenue = scheduled.reduce((total, appointment) => total + (appointment.paymentStatus === "paid" ? appointment.amount : 0), 0);

    return {
      name: barber.name,
      scheduled: scheduled.length,
      completed,
      revenue
    };
  });
}

export function getRevenueChart(state: BarbershopState, intervalDays = 7) {
  const days = eachDayOfInterval({ start: addDays(new Date(), -intervalDays + 1), end: new Date() });

  return days.map((day) => {
    const dayAppointments = state.appointments.filter((appointment) => isSameDay(parseISO(appointment.start), day));
    const income = dayAppointments.reduce((total, appointment) => total + (appointment.paymentStatus === "paid" ? appointment.amount : 0), 0);
    const projected = dayAppointments.reduce((total, appointment) => total + (appointment.status === "cancelled" || appointment.status === "blocked" ? 0 : appointment.amount), 0);

    return {
      label: format(day, "EEE dd"),
      income,
      projected
    };
  });
}

export function getMonthlyChart(state: BarbershopState) {
  const days = eachDayOfInterval({ start: addDays(new Date(), -29), end: new Date() });
  return days.map((day) => ({
    day: format(day, "dd/MM"),
    value: state.appointments.filter((appointment) => isSameDay(parseISO(appointment.start), day) && appointment.paymentStatus === "paid").reduce((total, appointment) => total + appointment.amount, 0)
  }));
}

export function getCampaignSegments(state: BarbershopState) {
  const noVisit30 = state.clients.filter((client) => !client.lastVisit || differenceInDays(new Date(), parseISO(client.lastVisit)) >= 30);
  const frequent = state.clients.filter((client) => client.visits >= 5);
  const noShows = state.clients.filter((client) => client.noShows >= 2);
  const highTicket = state.clients.filter((client) => client.avgTicket >= 220);
  const noFuture = state.clients.filter(
    (client) => !state.appointments.some((appointment) => appointment.clientId === client.id && ["pending", "walk-in"].includes(appointment.status) && +new Date(appointment.start) > Date.now())
  );

  return {
    noVisit30,
    frequent,
    noShows,
    highTicket,
    noFuture
  };
}

export function getClientInsights(client: Client, appointments: Appointment[]) {
  const clientAppointments = appointments.filter((appointment) => appointment.clientId === client.id && appointment.status !== "blocked");
  const futureVisit = clientAppointments.find((appointment) => ["pending", "walk-in"].includes(appointment.status) && +new Date(appointment.start) > Date.now()) ?? null;
  const lapseDays = client.lastVisit ? differenceInDays(new Date(), parseISO(client.lastVisit)) : 60;
  const risk = lapseDays > 45 ? "Alta" : lapseDays > 28 ? "Media" : "Baja";

  return {
    futureVisit,
    risk,
    avgTicket: clientAppointments.length ? Math.round(client.totalSpent / client.visits) : client.avgTicket,
    frequency: client.frequencyDays,
    noShows: client.noShows
  };
}

export function getTodayCashSummary(state: BarbershopState) {
  const today = getTodayAppointments(state.appointments);
  const projected = today.filter((appointment) => appointment.status !== "cancelled" && appointment.status !== "blocked").reduce((total, appointment) => total + appointment.amount, 0);
  const paid = today.filter((appointment) => appointment.paymentStatus === "paid").reduce((total, appointment) => total + appointment.amount, 0);

  return { projected, paid };
}