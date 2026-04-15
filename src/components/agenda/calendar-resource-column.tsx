"use client";

import { Scissors, TimerReset } from "lucide-react";
import { CalendarEventBlock } from "@/components/agenda/calendar-event-block";
import { CalendarSlotLayer } from "@/components/agenda/calendar-slot-layer";
import { getDayHeight } from "@/lib/calendar-ui";
import type { CalendarResourceColumnData } from "@/lib/calendar-ui";
import type { Appointment } from "@/lib/types";

export function CalendarResourceColumn({
  column,
  openingTime,
  closingTime,
  onSlotSelect,
  onEventSelect,
  highlightedAppointmentIds
}: {
  column: CalendarResourceColumnData;
  openingTime: string;
  closingTime: string;
  onSlotSelect: (selection: { barberId: string; start: string; end: string }) => void;
  onEventSelect: (appointment: Appointment) => void;
  highlightedAppointmentIds?: Set<string>;
}) {
  const dayHeight = getDayHeight(openingTime, closingTime);

  return (
    <div className="min-w-[250px] rounded-[26px] border border-white/10 bg-slate-950/55 backdrop-blur-sm">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">{column.barber.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{column.appointments.length} bloques activos</p>
          </div>
          <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: column.barber.color }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
            <p className="flex items-center gap-1.5 text-slate-400"><Scissors className="h-3.5 w-3.5" /> Ocupado</p>
            <p className="mt-1 text-sm font-semibold text-white">{Math.round(column.bookedMinutes / 60)} h</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
            <p className="flex items-center gap-1.5 text-slate-400"><TimerReset className="h-3.5 w-3.5" /> Disponible</p>
            <p className="mt-1 text-sm font-semibold text-white">{Math.round(column.availableMinutes / 60)} h</p>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: dayHeight }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)",
            backgroundSize: "100% 88px, 100% 44px"
          }}
        />
        <CalendarSlotLayer barber={column.barber} slots={column.slots} openingTime={openingTime} onSelect={onSlotSelect} />
        {column.appointments.map((appointment) => (
          <CalendarEventBlock
            key={appointment.id}
            appointment={appointment}
            openingTime={openingTime}
            onClick={onEventSelect}
            dimmed={highlightedAppointmentIds ? !highlightedAppointmentIds.has(appointment.id) && appointment.status !== "blocked" : false}
          />
        ))}
      </div>
    </div>
  );
}
