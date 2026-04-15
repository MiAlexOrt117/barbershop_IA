import { format } from "date-fns";
import { CalendarClock, CheckCircle2, CircleSlash, DollarSign, MessageCircleMore, ShieldAlert, UserRound } from "lucide-react";
import { Badge, Button, Card } from "./ui";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Appointment } from "@/lib/types";

const statusMap: Record<Appointment["status"], { label: string; tone: "default" | "success" | "warning" | "danger" | "muted" }> = {
  pending: { label: "Pendiente", tone: "warning" },
  completed: { label: "Completado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
  "no-show": { label: "No asistió", tone: "danger" },
  "walk-in": { label: "Walk-in", tone: "default" },
  blocked: { label: "Bloqueado", tone: "muted" }
};

export function AppointmentCard({ appointment, onComplete, onPaid, onCancel, onNoShow }: {
  appointment: Appointment;
  onComplete?: (id: string) => void;
  onPaid?: (id: string) => void;
  onCancel?: (id: string) => void;
  onNoShow?: (id: string) => void;
}) {
  const status = statusMap[appointment.status];
  const waLink = buildWhatsAppLink(
    appointment.clientPhone,
    `Hola ${appointment.clientName}, te escribimos desde Barbería Norte sobre tu cita de ${format(new Date(appointment.start), "dd/MM HH:mm")}.`
  );

  return (
    <Card className="border-white/8 bg-panel2/80">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/8 text-white">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{appointment.clientName}</h3>
              <p className="text-sm text-slate-400">{appointment.serviceName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1">
              <CalendarClock className="h-4 w-4" />
              {format(new Date(appointment.start), "HH:mm")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1">{appointment.barberName}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone={appointment.paymentStatus === "paid" ? "success" : "warning"}>{appointment.paymentStatus === "paid" ? "Pago confirmado" : "Pago pendiente"}</Badge>
          </div>
          {appointment.notes ? <p className="max-w-xl text-sm text-slate-300">{appointment.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {appointment.paymentStatus !== "paid" ? (
            <Button variant="secondary" size="sm" onClick={() => onPaid?.(appointment.id)}>
              <DollarSign className="h-4 w-4" /> Confirmar pago
            </Button>
          ) : null}
          {appointment.status !== "completed" ? (
            <Button variant="secondary" size="sm" onClick={() => onComplete?.(appointment.id)}>
              <CheckCircle2 className="h-4 w-4" /> Completar
            </Button>
          ) : null}
          {appointment.status !== "no-show" ? (
            <Button variant="secondary" size="sm" onClick={() => onNoShow?.(appointment.id)}>
              <ShieldAlert className="h-4 w-4" /> No asistió
            </Button>
          ) : null}
          {appointment.cancellable ? (
            <Button variant="danger" size="sm" onClick={() => onCancel?.(appointment.id)}>
              <CircleSlash className="h-4 w-4" /> Cancelar
            </Button>
          ) : null}
          {appointment.clientPhone ? (
            <Button variant="ghost" size="sm" onClick={() => window.open(waLink, "_blank", "noopener,noreferrer")}>
              <MessageCircleMore className="h-4 w-4" /> WhatsApp
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}