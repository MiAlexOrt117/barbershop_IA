"use client";

import { CalendarClock } from "lucide-react";
import { CalendarResourceColumn } from "@/components/agenda/calendar-resource-column";
import { buildCalendarColumns, buildTimeMarkers, getDayHeight } from "@/lib/calendar-ui";
import type { Appointment, Barber } from "@/lib/types";

export function CalendarGrid({
  appointments,
  barbers,
  openingTime,
  closingTime,
  date,
  onSlotSelect,
  onEventSelect,
  highlightedAppointmentIds
}: {
  appointments: Appointment[];
  barbers: Barber[];
  openingTime: string;
  closingTime: string;
  date: string;
  onSlotSelect: (selection: { barberId: string; start: string; end: string }) => void;
  onEventSelect: (appointment: Appointment) => void;
  highlightedAppointmentIds?: Set<string>;
}) {
  const columns = buildCalendarColumns({ appointments, barbers, openingTime, closingTime, date });
  const timeMarkers = buildTimeMarkers(openingTime, closingTime);
  const dayHeight = getDayHeight(openingTime, closingTime);

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-panel/60">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <CalendarClock className="h-4 w-4 text-accent" />
          Agenda tipo calendar
        </div>
        <p className="mt-1 text-sm text-slate-400">Haz clic en un slot libre para crear una cita o toca un bloque para abrir acciones rápidas.</p>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[88px_minmax(0,1fr)]">
          <div className="relative border-r border-white/10 bg-slate-950/60" style={{ height: dayHeight + 1 }}>
            {timeMarkers.map((marker) => (
              <div key={marker.label} className="absolute inset-x-0" style={{ top: marker.top }}>
                <div className="absolute -top-3 right-3 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {marker.label}
                </div>
                <div className="absolute right-0 top-0 h-px w-3 bg-white/15" />
              </div>
            ))}
          </div>

          <div className="overflow-x-auto px-3 py-3">
            <div className="grid auto-cols-fr grid-flow-col gap-3">
              {columns.map((column) => (
                <CalendarResourceColumn
                  key={column.barber.id}
                  column={column}
                  openingTime={openingTime}
                  closingTime={closingTime}
                  onSlotSelect={onSlotSelect}
                  onEventSelect={onEventSelect}
                  highlightedAppointmentIds={highlightedAppointmentIds}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
