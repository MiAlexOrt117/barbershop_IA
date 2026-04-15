"use client";

import { Plus } from "lucide-react";
import { CALENDAR_SLOT_MINUTES, getAppointmentOffset } from "@/lib/calendar-ui";
import type { CalendarSlot } from "@/lib/calendar-ui";
import type { Barber } from "@/lib/types";

export function CalendarSlotLayer({
  barber,
  slots,
  openingTime,
  onSelect
}: {
  barber: Barber;
  slots: CalendarSlot[];
  openingTime: string;
  onSelect: (selection: { barberId: string; start: string; end: string }) => void;
}) {
  return (
    <div className="absolute inset-0">
      {slots.map((slot) => {
        const { top, height } = getAppointmentOffset(
          {
            id: slot.id,
            clientId: null,
            clientName: "",
            clientPhone: "",
            serviceId: null,
            serviceName: "",
            barberId: barber.id,
            barberName: barber.name,
            start: slot.start,
            end: slot.end,
            status: "pending",
            source: "scheduled",
            paymentStatus: "pending",
            amount: 0,
            createdAt: slot.start,
            notes: "",
            cancellable: false
          },
          openingTime
        );

        return (
          <button
            key={slot.id}
            type="button"
            disabled={!slot.available}
            onClick={() => onSelect({ barberId: barber.id, start: slot.start, end: slot.end })}
            className="group absolute inset-x-0 z-10 rounded-none border-b border-white/5 text-left transition disabled:pointer-events-none"
            style={{ top, height: Math.max(height, (CALENDAR_SLOT_MINUTES / 60) * 12) }}
            aria-label={slot.available ? `Crear cita a las ${slot.label} con ${barber.name}` : `${slot.label} ocupado`}
          >
            <span className="absolute inset-x-2 inset-y-1 rounded-xl border border-dashed border-transparent transition group-hover:border-cyan-300/45 group-hover:bg-cyan-300/7" />
            {!slot.available ? (
              <span className="absolute inset-x-2 inset-y-1 rounded-xl bg-white/[0.02]" />
            ) : null}
            {slot.available ? (
              <span className="absolute right-3 top-2 flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 opacity-0 transition group-hover:opacity-100">
                <Plus className="h-3 w-3" /> Slot libre
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
