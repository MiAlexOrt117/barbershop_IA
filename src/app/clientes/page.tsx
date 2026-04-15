"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, Input, Label, Textarea, SectionTitle } from "@/components/ui";
import { useBarbershopStore } from "@/lib/store";
import { getClientInsights } from "@/lib/metrics";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export default function ClientsPage() {
  const state = useBarbershopStore();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(state.clients[0]?.id ?? "");
  const selectedClient = state.clients.find((client) => client.id === selectedId) ?? state.clients[0];
  const insights = selectedClient ? getClientInsights(selectedClient, state.appointments) : null;

  const clients = useMemo(
    () => state.clients.filter((client) => `${client.name} ${client.phone}`.toLowerCase().includes(query.toLowerCase())).sort((left, right) => right.totalSpent - left.totalSpent),
    [query, state.clients]
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <SectionTitle eyebrow="CRM" title="Clientes" subtitle="Búsqueda rápida, perfil individual, historial y señales simples de retención." />
          <div className="mt-5 max-w-xl">
            <Label>Buscar por nombre o teléfono</Label>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Carlos o +52..." />
          </div>
        </Card>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <div className="space-y-3">
              {clients.map((client) => (
                <button key={client.id} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/8" onClick={() => setSelectedId(client.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{client.name}</p>
                      <p className="text-sm text-slate-400">{client.phone}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>${client.totalSpent.toLocaleString("es-MX")}</p>
                      <p>{client.visits} visitas</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {selectedClient ? (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SectionTitle eyebrow="Perfil del cliente" title={selectedClient.name} subtitle={selectedClient.phone} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedClient.vip ? <Badge tone="success">VIP</Badge> : null}
                    <Badge tone={insights?.risk === "Alta" ? "danger" : insights?.risk === "Media" ? "warning" : "muted"}>Riesgo {insights?.risk}</Badge>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => window.open(buildWhatsAppLink(selectedClient.phone, `Hola ${selectedClient.name}, te escribimos desde Barbería Norte.`), "_blank", "noopener,noreferrer")}>WhatsApp</Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">LTV</p>
                  <p className="mt-2 text-2xl font-semibold text-white">${selectedClient.totalSpent.toLocaleString("es-MX")}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Frecuencia estimada</p>
                  <p className="mt-2 text-2xl font-semibold text-white">Cada {selectedClient.frequencyDays} días</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">No-shows</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{selectedClient.noShows}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Última visita</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedClient.lastVisit ? format(parseISO(selectedClient.lastVisit), "dd/MM/yyyy") : "Sin visitas"}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Label>Notas internas</Label>
                <Textarea value={selectedClient.internalNotes} readOnly />
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p>Próxima cita: {selectedClient.nextVisit ? format(parseISO(selectedClient.nextVisit), "dd/MM/yyyy HH:mm") : "sin cita futura"}</p>
                <p className="mt-1">Ticket promedio: ${selectedClient.avgTicket.toLocaleString("es-MX")}</p>
                <p className="mt-1">Insigth de abandono: {insights?.risk === "Alta" ? "cliente para reactivación inmediata" : "seguimiento regular"}</p>
              </div>
            </Card>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}