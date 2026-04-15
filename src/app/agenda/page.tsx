"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar1, ChevronLeft, ChevronRight, CircleDot, Plus, Scissors, Timer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppointmentActionsModal } from "@/components/agenda/appointment-actions-modal";
import { AppointmentFormModal } from "@/components/agenda/appointment-form-modal";
import { CalendarGrid } from "@/components/agenda/calendar-grid";
import { CancelAppointmentModal, EmergencyCloseModal, WalkInModal } from "@/components/modals";
import { Badge, Button, Card, Input, Label, Select, SectionTitle } from "@/components/ui";
import { buildCalendarColumns, getDayAppointments } from "@/lib/calendar-ui";
import { useBarbershopStore } from "@/lib/store";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export default function AgendaPage() {
  const state = useBarbershopStore();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [barberFilter, setBarberFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [slotSelection, setSlotSelection] = useState<{ barberId: string; start: string } | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string; phone: string } | null>(null);

  const resourceBarbers = useMemo(
    () => state.barbers.filter((barber) => barber.active).filter((barber) => (barberFilter === "all" ? true : barber.id === barberFilter)),
    [barberFilter, state.barbers]
  );

  const dayAppointments = useMemo(() => getDayAppointments(state.appointments, date), [date, state.appointments]);

  const appointmentsForCalendar = useMemo(
    () =>
      dayAppointments.filter((appointment) => {
        return barberFilter === "all" ? true : appointment.barberId === barberFilter || (appointment.status === "blocked" && !appointment.barberId);
      }),
    [barberFilter, dayAppointments]
  );

  const highlightedAppointmentIds = useMemo(
    () =>
      search
        ? new Set(
            appointmentsForCalendar
              .filter((appointment) => `${appointment.clientName} ${appointment.serviceName} ${appointment.barberName}`.toLowerCase().includes(search.toLowerCase()))
              .map((appointment) => appointment.id)
          )
        : undefined,
    [appointmentsForCalendar, search]
  );

  const calendarColumns = useMemo(
    () =>
      buildCalendarColumns({
        appointments: appointmentsForCalendar,
        barbers: resourceBarbers,
        openingTime: state.settings.openingTime,
        closingTime: state.settings.closingTime,
        date
      }),
    [appointmentsForCalendar, date, resourceBarbers, state.settings.closingTime, state.settings.openingTime]
  );

  const visibleAppointments = appointmentsForCalendar.filter((appointment) => appointment.status !== "blocked");
  const activeAppointment = state.appointments.find((appointment) => appointment.id === activeAppointmentId) ?? null;
  const editingAppointment = state.appointments.find((appointment) => appointment.id === editingAppointmentId) ?? null;

  const bookingLink = buildWhatsAppLink(state.settings.phone, `Hola, quiero agendar un servicio para el ${date}.`);
  const failedSyncCount = visibleAppointments.filter((appointment) => appointment.syncStatus === "failed").length;
  const blockedCount = appointmentsForCalendar.filter((appointment) => appointment.status === "blocked").length;
  const freeMinutes = calendarColumns.reduce((total, column) => total + column.availableMinutes, 0);
  const bookedMinutes = calendarColumns.reduce((total, column) => total + column.bookedMinutes, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_32%)]" />
          <div className="relative">
            <SectionTitle
              eyebrow="Agenda / Timeline"
              title="Vista diaria tipo Google Calendar"
              subtitle="Grilla por horas, columnas por barbero y disponibilidad visible para operar la barbería como un producto real."
            />

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_auto_auto_auto_auto] xl:items-end">
              <div className="flex items-center gap-2 rounded-[24px] border border-white/10 bg-slate-950/40 p-2">
                <Button variant="ghost" onClick={() => setDate(format(addDays(new Date(`${date}T00:00:00`), -1), "yyyy-MM-dd"))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1 px-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Día visible</p>
                  <p className="truncate text-lg font-semibold capitalize text-white">{format(new Date(`${date}T12:00:00`), "EEEE, dd MMMM", { locale: es })}</p>
                </div>
                <Button variant="ghost" onClick={() => setDate(format(addDays(new Date(`${date}T00:00:00`), 1), "yyyy-MM-dd"))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>

              <div>
                <Label>Barbero</Label>
                <Select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  {state.barbers.filter((barber) => barber.active).map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Buscar</Label>
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, servicio o barbero" />
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setSlotSelection({
                      barberId: resourceBarbers[0]?.id ?? state.barbers[0]?.id ?? "",
                      start: new Date(`${date}T${state.settings.openingTime}:00`).toISOString()
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Nueva cita
                </Button>
                <Button variant="primary" onClick={() => setWalkInOpen(true)}>
                  <Scissors className="h-4 w-4" /> Walk-in
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
              <Badge tone="warning">Pendiente</Badge>
              <Badge tone="success">Completado</Badge>
              <Badge tone="danger">Cancelado</Badge>
              <Badge tone="default">Walk-in</Badge>
              <Badge tone="danger">No-show</Badge>
              <Badge tone="muted">Bloqueado</Badge>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <CalendarGrid
            appointments={appointmentsForCalendar}
            barbers={resourceBarbers}
            openingTime={state.settings.openingTime}
            closingTime={state.settings.closingTime}
            date={date}
            onSlotSelect={({ barberId, start }) => setSlotSelection({ barberId, start })}
            onEventSelect={(appointment) => setActiveAppointmentId(appointment.id)}
            highlightedAppointmentIds={highlightedAppointmentIds}
          />

          <div className="space-y-4">
            <Card>
              <SectionTitle eyebrow="Disponibilidad" title="Capacidad del día" subtitle="Lectura rápida para demo y operación en tiempo real." />
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="inline-flex items-center gap-2"><Calendar1 className="h-4 w-4 text-accent" /> Citas visibles</span>
                  <span className="font-semibold text-white">{visibleAppointments.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="inline-flex items-center gap-2"><CircleDot className="h-4 w-4 text-cyan-300" /> Slots bloqueados</span>
                  <span className="font-semibold text-white">{blockedCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="inline-flex items-center gap-2"><Timer className="h-4 w-4 text-emerald-300" /> Tiempo libre</span>
                  <span className="font-semibold text-white">{Math.round(freeMinutes / 60)} h</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="inline-flex items-center gap-2"><Scissors className="h-4 w-4 text-violet-300" /> Tiempo reservado</span>
                  <span className="font-semibold text-white">{Math.round(bookedMinutes / 60)} h</span>
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle eyebrow="Sync" title="Estado de integraciones" subtitle="Visibilidad directa sobre Google Calendar y automatizaciones." />
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <span>Fallos de sync hoy</span>
                    <Badge tone={failedSyncCount ? "danger" : "success"}>{failedSyncCount}</Badge>
                  </div>
                  <p className="mt-2 text-slate-400">Los bloques con error quedan marcados visualmente para reintento o revisión manual.</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="font-semibold text-white">Acción rápida</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => window.open(bookingLink, "_blank", "noopener,noreferrer")}>
                      Link de agenda
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => setCloseOpen(true)}>
                      Cerrar agenda
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle eyebrow="Barberos" title="Columnas activas" />
              <div className="mt-4 space-y-3">
                {calendarColumns.map((column) => (
                  <div key={column.barber.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: column.barber.color }} />
                        <div>
                          <p className="font-semibold text-white">{column.barber.name}</p>
                          <p className="text-xs text-slate-400">{column.appointments.filter((appointment) => appointment.status !== "blocked").length} citas asignadas</p>
                        </div>
                      </div>
                      <Badge tone="default">{Math.round(column.availableMinutes / 30)} slots</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>

      <AppointmentFormModal open={Boolean(slotSelection)} mode="create" slotSelection={slotSelection} onClose={() => setSlotSelection(null)} />
      <AppointmentFormModal open={Boolean(editingAppointment)} mode="edit" appointment={editingAppointment} onClose={() => setEditingAppointmentId(null)} />
      <AppointmentActionsModal
        open={Boolean(activeAppointment)}
        appointment={activeAppointment}
        onClose={() => setActiveAppointmentId(null)}
        onEdit={(appointment) => setEditingAppointmentId(appointment.id)}
        onCancelRequest={(appointment) => setCancelTarget({ id: appointment.id, name: appointment.clientName, phone: appointment.clientPhone })}
      />
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
