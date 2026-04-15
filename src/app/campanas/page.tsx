"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, Label, Select, Textarea, SectionTitle } from "@/components/ui";
import { useBarbershopStore } from "@/lib/store";
import { getCampaignSegments } from "@/lib/metrics";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const segmentLabels = {
  noVisit30: "Clientes que no vienen hace 30 días",
  frequent: "Clientes frecuentes",
  noShows: "Clientes con más de 2 faltas",
  highTicket: "Clientes con ticket alto",
  noFuture: "Clientes sin cita futura"
} as const;

export default function CampaignsPage() {
  const state = useBarbershopStore();
  const segments = useMemo(() => getCampaignSegments(state), [state]);
  const [segment, setSegment] = useState<keyof typeof segmentLabels>("noVisit30");
  const [templateId, setTemplateId] = useState(state.campaignTemplates[0]?.id ?? "");

  const selectedClients = segments[segment];
  const template = state.campaignTemplates.find((item) => item.id === templateId) ?? state.campaignTemplates[0];
  const preview = template?.message.replaceAll("{{name}}", selectedClients[0]?.name ?? "Cliente") ?? "";

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <SectionTitle eyebrow="Marketing / CRM" title="Campañas" subtitle="Segmentos listos para reactivación, fidelización y mensajes masivos simulados." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <Label>Segmento</Label>
              <Select value={segment} onChange={(event) => setSegment(event.target.value as keyof typeof segmentLabels)}>
                {Object.entries(segmentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Plantilla</Label>
              <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {state.campaignTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Impacto estimado</p>
              <p className="mt-2 text-3xl font-semibold text-white">{selectedClients.length}</p>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <SectionTitle eyebrow="Mensaje" title="Generador de campaña" subtitle="El MVP puede simular envíos o generar mensajes prellenados para WhatsApp." />
            <Textarea className="mt-5 min-h-[220px]" value={preview} readOnly />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => window.open(buildWhatsAppLink(state.settings.phone, preview), "_blank", "noopener,noreferrer")}>Simular envío</Button>
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(preview)}>Copiar mensaje</Button>
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Segmento incluido" title="Clientes impactados" />
            <div className="mt-4 space-y-3">
              {selectedClients.slice(0, 10).map((client) => (
                <div key={client.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{client.name}</p>
                      <p className="text-sm text-slate-400">{client.phone}</p>
                    </div>
                    <Badge tone={client.vip ? "success" : "muted"}>{client.vip ? "VIP" : "Normal"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}