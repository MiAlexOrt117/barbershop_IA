"use client";

import { AppShell } from "@/components/app-shell";
import { GoogleCalendarCard } from "@/components/google-calendar-card";
import { MakeWebhookCard } from "@/components/make-webhook-card";
import { Badge, Button, Card, Input, Label, Select, SectionTitle, Textarea } from "@/components/ui";
import { useBarbershopStore } from "@/lib/store";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export default function SettingsPage() {
  const state = useBarbershopStore();
  const supportLink = buildWhatsAppLink(state.settings.supportPhone, "Hola, necesito ayuda con la plataforma de barbería.");

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <SectionTitle eyebrow="Configuración" title="Negocio, servicios y roles" subtitle="La capa está lista para evolucionar a backend real sin rehacer la UI." />
        </Card>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <SectionTitle eyebrow="Negocio" title="Datos básicos" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div><Label>Nombre</Label><Input value={state.settings.name} onChange={(event) => state.updateSettings({ name: event.target.value })} /></div>
              <div><Label>Teléfono</Label><Input value={state.settings.phone} onChange={(event) => state.updateSettings({ phone: event.target.value })} /></div>
              <div><Label>Soporte WhatsApp</Label><Input value={state.settings.supportPhone} onChange={(event) => state.updateSettings({ supportPhone: event.target.value })} /></div>
              <div><Label>Dirección</Label><Input value={state.settings.address} onChange={(event) => state.updateSettings({ address: event.target.value })} /></div>
              <div><Label>Apertura</Label><Input type="time" value={state.settings.openingTime} onChange={(event) => state.updateSettings({ openingTime: event.target.value })} /></div>
              <div><Label>Cierre</Label><Input type="time" value={state.settings.closingTime} onChange={(event) => state.updateSettings({ closingTime: event.target.value })} /></div>
            </div>
            <div className="mt-5">
              <Label>Notas de escalabilidad</Label>
              <Textarea readOnly value="Esta configuración se puede migrar a Supabase/PostgreSQL manteniendo la misma interfaz y acciones." />
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Acceso" title="Roles y permisos" />
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"><span>Rol actual</span><Badge tone={state.role === "owner" ? "success" : "warning"}>{state.role}</Badge></div>
              <div className="rounded-2xl bg-white/5 p-4">Dueño ve agenda, clientes, finanzas, campañas y soporte.</div>
              <div className="rounded-2xl bg-white/5 p-4">Empleado puede operar agenda y clientes, con finanzas ocultas en una evolución futura.</div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" onClick={() => state.setRole("owner")}>Simular dueño</Button>
              <Button variant="secondary" onClick={() => state.setRole("employee")}>Simular empleado</Button>
              <Button variant="primary" onClick={() => window.open(supportLink, "_blank", "noopener,noreferrer")}>Soporte</Button>
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Servicios" title="Catálogo" />
            <div className="mt-4 space-y-3">
              {state.services.map((service) => (
                <div key={service.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{service.name}</p>
                      <p className="text-sm text-slate-400">${service.price} · {service.duration} min</p>
                    </div>
                    <Badge tone={service.active ? "success" : "muted"}>{service.active ? "Activo" : "Inactivo"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <GoogleCalendarCard />
          <MakeWebhookCard />
        </section>
      </div>
    </AppShell>
  );
}
