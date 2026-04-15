"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { useBarbershopStore } from "@/lib/store";
import { downloadCsv } from "@/lib/export";
import { getBarberPerformance, getMonthlyChart, getRevenueChart, getTopServices } from "@/lib/metrics";

const StatsCharts = dynamic(() => import("@/components/stats-charts").then((module) => module.StatsCharts), { ssr: false });

export default function StatsPage() {
  const state = useBarbershopStore();
  const weekly = useMemo(() => getRevenueChart(state, 7), [state]);
  const monthly = useMemo(() => getMonthlyChart(state), [state]);
  const topServices = useMemo(() => getTopServices(state), [state]);
  const barberPerformance = useMemo(() => getBarberPerformance(state), [state]);

  function exportCsv() {
    downloadCsv(
      "barbershop-estadisticas.csv",
      state.appointments.map((appointment) => ({
        id: appointment.id,
        cliente: appointment.clientName,
        servicio: appointment.serviceName,
        barbero: appointment.barberName,
        fecha: appointment.start,
        estado: appointment.status,
        pago: appointment.paymentStatus,
        monto: appointment.amount
      }))
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow="Analítica" title="Estadísticas y finanzas" subtitle="Ingresos, ocupación, servicios top y desempeño por barbero con visuales limpias." />
            <Button variant="primary" onClick={exportCsv}>Exportar a Excel / CSV</Button>
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Visualización" title="Métricas principales" />
          <div className="mt-4">
            <StatsCharts weekly={weekly} monthly={monthly} topServices={topServices} barberPerformance={barberPerformance} />
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Sugerencia de producto" title="Prioridad siguiente" />
          <p className="mt-4 text-sm text-slate-300">Si la ocupación sube sobre 80%, conviene habilitar recordatorios automáticos y bloqueo inteligente de huecos.</p>
        </Card>
      </div>
    </AppShell>
  );
}