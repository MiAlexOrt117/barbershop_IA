"use client";

import { format } from "date-fns";
import { CalendarRange, CircleSlash, CloudAlert, CreditCard, MessageCircleMore, PencilLine, ShieldAlert, Sparkles } from "lucide-react";
import { Badge, Button, Modal } from "@/components/ui";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useBarbershopStore } from "@/lib/store";
import type { Appointment } from "@/lib/types";

const syncToneMap: Record<NonNullable<Appointment["syncStatus"]>, "default" | "success" | "warning" | "danger" | "muted"> = {
  pending: "warning",
  synced: "success",
  failed: "danger",
  conflict: "default"
};

export function AppointmentActionsModal({
  open,
  appointment,
  onClose,
  onEdit,
  onCancelRequest
}: {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onCancelRequest: (appointment: Appointment) => void;
}) {
  const { markCompleted, markPaid, markNoShow } = useBarbershopStore();

  if (!appointment) return null;

  const waLink = appointment.clientPhone
    ? buildWhatsAppLink(
        appointment.clientPhone,
        `Hola ${appointment.clientName}, te confirmamos tu cita de ${appointment.serviceName} para el ${format(new Date(appointment.start), "dd/MM")} a las ${format(new Date(appointment.start), "HH:mm")}.`
      )
    : null;

  return (
    <Modal open={open} title={appointment.status === "blocked" ? "Bloqueo de agenda" : appointment.clientName} description="Acciones rápidas operativas sin salir de la vista diaria." onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="default">{appointment.serviceName}</Badge>
            <Badge tone={syncToneMap[appointment.syncStatus ?? "pending"]}>
              Sync {appointment.syncStatus ?? "pending"}
            </Badge>
            <Badge tone={appointment.paymentStatus === "paid" ? "success" : "warning"}>
              {appointment.paymentStatus === "paid" ? "Pago confirmado" : "Pago pendiente"}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
              <p className="flex items-center gap-2 text-slate-400"><CalendarRange className="h-4 w-4" /> Horario</p>
              <p className="mt-1 font-semibold text-white">
                {format(new Date(appointment.start), "dd/MM/yyyy")} · {format(new Date(appointment.start), "HH:mm")} - {format(new Date(appointment.end), "HH:mm")}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
              <p className="flex items-center gap-2 text-slate-400"><Sparkles className="h-4 w-4" /> Recurso</p>
              <p className="mt-1 font-semibold text-white">{appointment.barberName}</p>
            </div>
          </div>

          {appointment.notes ? <p className="mt-4 rounded-2xl bg-slate-950/45 px-4 py-3 text-sm text-slate-300">{appointment.notes}</p> : null}
          {appointment.syncError ? (
            <p className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <span className="inline-flex items-center gap-2 font-semibold"><CloudAlert className="h-4 w-4" /> Error de sync</span>
              <span className="mt-1 block">{appointment.syncError}</span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {appointment.status !== "blocked" ? (
            <Button variant="secondary" onClick={() => { onEdit(appointment); onClose(); }}>
              <PencilLine className="h-4 w-4" /> Editar
            </Button>
          ) : null}

          {appointment.paymentStatus !== "paid" && appointment.status !== "blocked" ? (
            <Button variant="secondary" onClick={() => markPaid(appointment.id)}>
              <CreditCard className="h-4 w-4" /> Confirmar pago
            </Button>
          ) : null}

          {appointment.status !== "completed" && appointment.status !== "blocked" ? (
            <Button variant="secondary" onClick={() => markCompleted(appointment.id)}>
              <Sparkles className="h-4 w-4" /> Marcar completada
            </Button>
          ) : null}

          {appointment.status !== "no-show" && appointment.status !== "blocked" ? (
            <Button variant="secondary" onClick={() => markNoShow(appointment.id)}>
              <ShieldAlert className="h-4 w-4" /> No-show
            </Button>
          ) : null}

          {appointment.cancellable ? (
            <Button variant="danger" onClick={() => { onCancelRequest(appointment); onClose(); }}>
              <CircleSlash className="h-4 w-4" /> Cancelar
            </Button>
          ) : null}

          {waLink ? (
            <Button variant="ghost" onClick={() => window.open(waLink, "_blank", "noopener,noreferrer")}>
              <MessageCircleMore className="h-4 w-4" /> WhatsApp
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
