import { addMinutes, format, isSameDay, parseISO } from "date-fns";
import type { Appointment, AppointmentStatus, Barber } from "./types";

export const CALENDAR_SLOT_MINUTES = 30;
export const CALENDAR_HOUR_HEIGHT = 88;
export const CALENDAR_PIXELS_PER_MINUTE = CALENDAR_HOUR_HEIGHT / 60;

export interface CalendarSlot {
  id: string;
  start: string;
  end: string;
  label: string;
  available: boolean;
  reason?: string;
}

export interface CalendarResourceColumnData {
  barber: Barber;
  appointments: Appointment[];
  slots: CalendarSlot[];
  bookedMinutes: number;
  availableMinutes: number;
}

const statusStyles: Record<
  AppointmentStatus,
  { label: string; backgroundClass: string; borderClass: string; textClass: string }
> = {
  pending: {
    label: "Pendiente",
    backgroundClass: "bg-cyan-400/14",
    borderClass: "border-cyan-300/50",
    textClass: "text-cyan-100"
  },
  completed: {
    label: "Completado",
    backgroundClass: "bg-emerald-400/18",
    borderClass: "border-emerald-300/55",
    textClass: "text-emerald-50"
  },
  cancelled: {
    label: "Cancelado",
    backgroundClass: "bg-rose-500/16",
    borderClass: "border-rose-300/50",
    textClass: "text-rose-50"
  },
  "no-show": {
    label: "No-show",
    backgroundClass: "bg-orange-500/18",
    borderClass: "border-orange-300/50",
    textClass: "text-orange-50"
  },
  "walk-in": {
    label: "Walk-in",
    backgroundClass: "bg-violet-400/18",
    borderClass: "border-violet-300/50",
    textClass: "text-violet-50"
  },
  blocked: {
    label: "Bloqueado",
    backgroundClass: "bg-slate-500/18",
    borderClass: "border-slate-300/45",
    textClass: "text-slate-100"
  }
};

export function getStatusVisual(status: AppointmentStatus) {
  return statusStyles[status];
}

export function getDayAppointments(appointments: Appointment[], date: string) {
  const day = new Date(`${date}T00:00:00`);
  return appointments.filter((appointment) => isSameDay(parseISO(appointment.start), day));
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function buildTimeMarkers(openingTime: string, closingTime: string) {
  const openingMinutes = timeToMinutes(openingTime);
  const closingMinutes = timeToMinutes(closingTime);
  const markers: Array<{ label: string; top: number }> = [];

  for (let minutes = openingMinutes; minutes <= closingMinutes; minutes += 60) {
    const hours = Math.floor(minutes / 60)
      .toString()
      .padStart(2, "0");
    markers.push({
      label: `${hours}:00`,
      top: (minutes - openingMinutes) * CALENDAR_PIXELS_PER_MINUTE
    });
  }

  return markers;
}

export function getDayHeight(openingTime: string, closingTime: string) {
  return (timeToMinutes(closingTime) - timeToMinutes(openingTime)) * CALENDAR_PIXELS_PER_MINUTE;
}

export function getAppointmentOffset(appointment: Appointment, openingTime: string) {
  const openingMinutes = timeToMinutes(openingTime);
  const appointmentStart = new Date(appointment.start);
  const appointmentEnd = new Date(appointment.end);
  const startMinutes = appointmentStart.getHours() * 60 + appointmentStart.getMinutes();
  const durationMinutes = Math.max((appointmentEnd.getTime() - appointmentStart.getTime()) / 60000, 20);

  return {
    top: (startMinutes - openingMinutes) * CALENDAR_PIXELS_PER_MINUTE,
    height: durationMinutes * CALENDAR_PIXELS_PER_MINUTE,
    durationMinutes
  };
}

function buildSlotsForBarber(date: string, barberAppointments: Appointment[], openingTime: string, closingTime: string) {
  const openingMinutes = timeToMinutes(openingTime);
  const closingMinutes = timeToMinutes(closingTime);
  const slots: CalendarSlot[] = [];

  for (let minutes = openingMinutes; minutes < closingMinutes; minutes += CALENDAR_SLOT_MINUTES) {
    const slotDate = new Date(`${date}T00:00:00`);
    slotDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    const slotStart = slotDate.toISOString();
    const slotEnd = addMinutes(slotDate, CALENDAR_SLOT_MINUTES).toISOString();

    const overlapping = barberAppointments.find((appointment) => {
      const appointmentStart = new Date(appointment.start).getTime();
      const appointmentEnd = new Date(appointment.end).getTime();
      return new Date(slotStart).getTime() < appointmentEnd && new Date(slotEnd).getTime() > appointmentStart;
    });

    slots.push({
      id: `${slotStart}-${slotEnd}`,
      start: slotStart,
      end: slotEnd,
      label: format(slotDate, "HH:mm"),
      available: !overlapping,
      reason: overlapping?.status === "blocked" ? "Agenda bloqueada" : overlapping ? "Ya ocupado" : undefined
    });
  }

  return slots;
}

export function buildCalendarColumns(params: {
  appointments: Appointment[];
  barbers: Barber[];
  openingTime: string;
  closingTime: string;
  date: string;
}) {
  const { appointments, barbers, openingTime, closingTime, date } = params;
  const sharedBlocks = appointments.filter((appointment) => appointment.source === "blocked" && !appointment.barberId);

  return barbers.map<CalendarResourceColumnData>((barber) => {
    const barberAppointments = appointments
      .filter((appointment) => appointment.barberId === barber.id || (appointment.source === "blocked" && !appointment.barberId))
      .sort((left, right) => +new Date(left.start) - +new Date(right.start));

    const slots = buildSlotsForBarber(date, barberAppointments, openingTime, closingTime);
    const bookedMinutes = barberAppointments.reduce((total, appointment) => {
      if (appointment.status === "blocked") return total;
      const appointmentStart = new Date(appointment.start).getTime();
      const appointmentEnd = new Date(appointment.end).getTime();
      return total + Math.max((appointmentEnd - appointmentStart) / 60000, 0);
    }, 0);
    const totalMinutes = timeToMinutes(closingTime) - timeToMinutes(openingTime);
    const blockedMinutes = sharedBlocks.reduce((total, block) => total + Math.max((+new Date(block.end) - +new Date(block.start)) / 60000, 0), 0);
    const availableMinutes = Math.max(totalMinutes - Math.min(bookedMinutes, totalMinutes) - blockedMinutes, 0);

    return {
      barber,
      appointments: barberAppointments,
      slots,
      bookedMinutes: Math.min(bookedMinutes, totalMinutes),
      availableMinutes
    };
  });
}
