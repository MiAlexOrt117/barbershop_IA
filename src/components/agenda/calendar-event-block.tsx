"use client";

import { format } from "date-fns";
import { AlertCircle, CheckCircle2, CloudAlert, CloudCog, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAppointmentOffset, getStatusVisual } from "@/lib/calendar-ui";
import type { Appointment } from "@/lib/types";

function SyncIcon({ status }: { status: Appointment["syncStatus"] }) {
  if (status === "failed") {
    return <CloudOff className="h-3.5 w-3.5" />;
  }

  if (status === "synced") {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }

  if (status === "conflict") {
    return <AlertCircle className="h-3.5 w-3.5" />;
  }

  return <CloudCog className="h-3.5 w-3.5" />;
}

export function CalendarEventBlock({
  appointment,
  openingTime,
  onClick,
  dimmed = false
}: {
  appointment: Appointment;
  openingTime: string;
  onClick: (appointment: Appointment) => void;
  dimmed?: boolean;
}) {
  const { top, height } = getAppointmentOffset(appointment, openingTime);
  const visual = getStatusVisual(appointment.status);
  const compact = height < 72;

  return (
    <button
      type="button"
      onClick={() => onClick(appointment)}
      className={cn(
        "absolute inset-x-2 z-20 overflow-hidden rounded-2xl border px-3 py-2 text-left shadow-[0_20px_35px_-22px_rgba(15,23,42,0.95)] transition hover:scale-[1.01] hover:shadow-[0_28px_45px_-20px_rgba(8,17,31,0.95)]",
        visual.backgroundClass,
        visual.borderClass,
        visual.textClass,
        dimmed ? "opacity-35 saturate-50" : "",
        appointment.status === "blocked" ? "bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.18),rgba(148,163,184,0.18)_12px,rgba(30,41,59,0.28)_12px,rgba(30,41,59,0.28)_24px)]" : ""
      )}
      style={{
        top,
        height: Math.max(height, 48),
        borderLeftColor: appointment.status === "blocked" ? "rgba(226,232,240,0.55)" : appointment.barberId ? undefined : "rgba(255,255,255,0.4)"
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {appointment.status === "blocked" ? appointment.serviceName : appointment.clientName}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/70">{appointment.serviceName}</p>
        </div>
        <span className="rounded-full bg-black/20 p-1 text-white/80">
          <SyncIcon status={appointment.syncStatus} />
        </span>
      </div>

      <div className={cn("mt-2 flex items-center justify-between gap-2 text-xs text-white/80", compact ? "mt-1" : "")}>
        <span>
          {format(new Date(appointment.start), "HH:mm")} - {format(new Date(appointment.end), "HH:mm")}
        </span>
        <span className="truncate">{appointment.barberName}</span>
      </div>

      {!compact ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/75">
          <span className="truncate">{appointment.notes || (appointment.status === "blocked" ? "Bloqueo operativo" : appointment.clientPhone || "Sin observaciones")}</span>
          {appointment.syncStatus === "failed" ? <CloudAlert className="h-3.5 w-3.5 shrink-0" /> : null}
        </div>
      ) : null}
    </button>
  );
}
