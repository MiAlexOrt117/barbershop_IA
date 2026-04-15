"use client";

import { useMemo, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { AppointmentCard } from "@/components/appointment-card";
import { EmergencyCloseModal, WalkInModal, CancelAppointmentModal } from "@/components/modals";
import { Badge, Button, Card, Input, Label, Select, SectionTitle } from "@/components/ui";
import { useBarbershopStore } from "@/lib/store";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export default function AgendaPage() {
  const state = useBarbershopStore();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [barberFilter, setBarberFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string; phone: string } | null>(null);

  const appointments = useMemo(
    () =>
      state.appointments
        .filter((appointment) => isSameDay(parseISO(appointment.start), new Date(`${date}T00:00:00`)))
        .filter((appointment) => (barberFilter === "all" ? true : appointment.barberId === barberFilter))
        .filter((appointment) => `${appointment.clientName} ${appointment.serviceName} ${appointment.barberName}`.toLowerCase().includes(search.toLowerCase()))
        .sort((left, right) => +new Date(left.start) - +new Date(right.start)),
    [barberFilter, date, search, state.appointments]
  );

  const bookingLink = buildWhatsAppLink(state.settings.phone, `Hola, quiero agendar un servicio para el ${date}.`);

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <SectionTitle eyebrow="Agenda / Calendario" title="Vista diaria" subtitle="Bloques por tiempo, estados por color y acciones rápidas para cada cita." />
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div>
              <Label>Barbero</Label>
              <Select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)}>
                <option value="all">Todos</option>
                {state.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Buscar</Label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, servicio o barbero" />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="primary" className="w-full" onClick={() => setWalkInOpen(true)}>+ Walk-in</Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
            <Badge tone="success">Completado</Badge>
            <Badge tone="warning">Pendiente</Badge>
            <Badge tone="danger">Cancelado / No asistió</Badge>
            <Badge tone="muted">Bloqueado</Badge>
          </div>
        </Card>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <SectionTitle eyebrow="Bloques" title="Agenda del día" subtitle="Cada bloque puede convertirse en walk-in, completarse, cancelarse o marcar no-show." />
            <div className="mt-5 space-y-3">
              {appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onComplete={(id) => state.markCompleted(id)}
                  onPaid={(id) => state.markPaid(id)}
                  onCancel={(id) => setCancelTarget({ id, name: appointment.clientName, phone: appointment.clientPhone })}
                  onNoShow={(id) => state.markNoShow(id)}
                />
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <SectionTitle eyebrow="Bloqueos rápidos" title="Operación" />
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>Crear nueva cita y abrir WhatsApp: agenda directa desde el canal principal.</p>
                <Button variant="secondary" className="w-full" onClick={() => window.open(bookingLink, "_blank", "noopener,noreferrer")}>Abrir link de agenda por WhatsApp</Button>
                <Button variant="danger" className="w-full" onClick={() => setCloseOpen(true)}>Cerrar agenda por contingencia</Button>
              </div>
            </Card>
            <Card>
              <SectionTitle eyebrow="Resumen" title="Estado del día" />
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between"><span>Citas visibles</span><span className="font-semibold text-white">{appointments.length}</span></div>
                <div className="flex items-center justify-between"><span>Walk-ins</span><span className="font-semibold text-white">{appointments.filter((appointment) => appointment.source === "walk-in").length}</span></div>
                <div className="flex items-center justify-between"><span>Bloqueados</span><span className="font-semibold text-white">{appointments.filter((appointment) => appointment.status === "blocked").length}</span></div>
              </div>
            </Card>
          </div>
        </section>
      </div>

      <WalkInModal open={walkInOpen} onClose={() => setWalkInOpen(false)} />
      <EmergencyCloseModal open={closeOpen} onClose={() => setCloseOpen(false)} />
      <CancelAppointmentModal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        appointmentId={cancelTarget?.id ?? null}
        clientName={cancelTarget?.name ?? ""}
        phone={cancelTarget?.phone ?? ""}
        onConfirm={(id) => state.cancelAppointment(id)}
      />
    </AppShell>
  );
}