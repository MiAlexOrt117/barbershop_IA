"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, ChevronRight, Clock3, UserRoundPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppointmentCard } from "@/components/appointment-card";
import { EmergencyCloseModal, WalkInModal } from "@/components/modals";
import { KpiCard } from "@/components/kpi-card";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { useBarbershopStore } from "@/lib/store";
import { getCompletionRatio, getNextAppointment, getProjectedRevenueForDay, getTodayCashSummary, getTodayAppointments } from "@/lib/metrics";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export default function DashboardPage() {
  const state = useBarbershopStore();
  const todayAppointments = useMemo(() => getTodayAppointments(state.appointments), [state.appointments]);
  const nextAppointment = useMemo(() => getNextAppointment(state.appointments), [state.appointments]);
  const projectedRevenue = useMemo(() => getProjectedRevenueForDay(state), [state]);
  const cashSummary = useMemo(() => getTodayCashSummary(state), [state]);
  const completion = useMemo(() => getCompletionRatio(state.appointments), [state.appointments]);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const supportLink = buildWhatsAppLink(state.settings.supportPhone, "Hola, necesito soporte en la plataforma de barbería.");

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
          <Card className="relative overflow-hidden border-white/10 bg-panel/80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(114,240,196,0.2),_transparent_36%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <Badge tone="success">Vista operativa del día</Badge>
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                  Agenda, clientes y negocio diario en un solo dashboard.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300">
                  MVP listo para demo comercial, con lógica realista, datos mock persistidos y base preparada para WhatsApp, automatizaciones y backend real.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" size="lg" onClick={() => setWalkInOpen(true)}>
                    <UserRoundPlus className="h-4 w-4" /> Walk-in (Cliente Físico)
                  </Button>
                  <Button variant="danger" size="lg" onClick={() => setCloseOpen(true)}>
                    <AlertTriangle className="h-4 w-4" /> Emergencia / Cerrar agenda
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => window.open(supportLink, "_blank", "noopener,noreferrer")}>
                    Soporte WhatsApp
                  </Button>
                </div>
              </div>
              <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/45 p-5 shadow-glow backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Próxima cita</p>
                {nextAppointment ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-2xl font-semibold text-white">{nextAppointment.clientName}</p>
                      <p className="mt-1 text-sm text-slate-400">{nextAppointment.serviceName}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <Clock3 className="h-4 w-4 text-accent" />
                      {format(new Date(nextAppointment.start), "HH:mm")} · {nextAppointment.barberName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={nextAppointment.paymentStatus === "paid" ? "success" : "warning"}>{nextAppointment.paymentStatus === "paid" ? "Pago listo" : "Pago pendiente"}</Badge>
                      <Badge tone="muted">{nextAppointment.status}</Badge>
                    </div>
                    <Button variant="ghost" className="w-full justify-between px-0" onClick={() => window.location.assign("/agenda")}>
                      Abrir agenda del día <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">No hay citas próximas.</p>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <KpiCard title="Proyección del día" value={`$${projectedRevenue.toLocaleString("es-MX")}`} hint="Ingresos potenciales de la agenda activa" delta={`${todayAppointments.length} citas`} tone="good" />
            <KpiCard title="Citas completadas" value={`${completion.completed}/${completion.total}`} hint="Completadas vs agendadas en el día" delta={`${completion.pending} pendientes`} tone="warn" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard title="Ingresos confirmados" value={`$${cashSummary.paid.toLocaleString("es-MX")}`} hint="Pagos ya confirmados" />
          <KpiCard title="Ocupación estimada" value={`${state.appointments.length ? Math.round((todayAppointments.length / Math.max(state.barbers.length * 6, 1)) * 100) : 0}%`} hint="Uso de silla durante el día" />
          <KpiCard title="Clientes VIP" value={String(state.clients.filter((client) => client.vip).length)} hint="Clientes prioritarios y recurrentes" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <SectionTitle eyebrow="Agenda activa" title="Flujo del día" subtitle="Vista rápida de los bloques de tiempo con acciones operativas inmediatas." />
            <div className="mt-5 space-y-3">
              {todayAppointments.slice(0, 5).map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onComplete={(id) => state.markCompleted(id)}
                  onPaid={(id) => state.markPaid(id)}
                  onCancel={(id) => state.cancelAppointment(id)}
                  onNoShow={(id) => state.markNoShow(id)}
                />
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <SectionTitle eyebrow="Inteligencia del negocio" title="Alertas útiles" />
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p className="rounded-2xl bg-white/6 p-3">{state.clients.filter((client) => client.noShows >= 2).length} clientes con riesgo por faltas repetidas.</p>
                <p className="rounded-2xl bg-white/6 p-3">{state.clients.filter((client) => !client.nextVisit).length} clientes sin cita futura, listos para campaña de reactivación.</p>
                <p className="rounded-2xl bg-white/6 p-3">{state.appointments.filter((appointment) => appointment.status === "cancelled").length} cancelaciones históricas registradas.</p>
              </div>
            </Card>

            <Card>
              <SectionTitle eyebrow="Accesos rápidos" title="Operación" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => window.location.assign("/clientes")}>Clientes</Button>
                <Button variant="secondary" onClick={() => window.location.assign("/campanas")}>Campañas</Button>
                <Button variant="secondary" onClick={() => window.location.assign("/estadisticas")}>Estadísticas</Button>
              </div>
            </Card>

            <Card>
              <SectionTitle eyebrow="Resumen rápido" title="Ritmo operativo" />
              <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                <span>Ingresos confirmados</span>
                <span className="font-semibold text-white">$ {cashSummary.paid.toLocaleString("es-MX")}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                <span>Proyección</span>
                <span className="font-semibold text-white">$ {cashSummary.projected.toLocaleString("es-MX")}</span>
              </div>
            </Card>
          </div>
        </section>
      </div>

      <WalkInModal open={walkInOpen} onClose={() => setWalkInOpen(false)} />
      <EmergencyCloseModal open={closeOpen} onClose={() => setCloseOpen(false)} />
    </AppShell>
  );
}