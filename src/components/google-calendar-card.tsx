"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, CalendarX2, CloudSun, RefreshCcw } from "lucide-react";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { disconnectGoogleCalendar, fetchGoogleCalendarStatus, type GoogleCalendarStatusResponse } from "@/lib/integration-client";

export function GoogleCalendarCard() {
  const [status, setStatus] = useState<GoogleCalendarStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);

    try {
      const nextStatus = await fetchGoogleCalendarStatus();
      setStatus(nextStatus);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo consultar el estado de Google Calendar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();

    function handleMessage(event: MessageEvent<{ type?: string; success?: boolean; message?: string }>) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "google-calendar-auth") return;

      setFeedback(event.data.message ?? null);
      void loadStatus();
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function handleConnect() {
    setFeedback(null);
    window.open("/api/integrations/google/connect", "google-calendar-auth", "width=640,height=760");
  }

  async function handleDisconnect() {
    await disconnectGoogleCalendar();
    setFeedback("La cuenta quedó desconectada. El sistema vuelve a fallback local.");
    void loadStatus();
  }

  const connected = Boolean(status?.connected);

  return (
    <Card>
      <SectionTitle eyebrow="Integración real" title="Google Calendar" subtitle="OAuth 2.0 real para crear, editar y cancelar eventos del calendario desde la agenda." />

      <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={connected ? "success" : "warning"}>{connected ? "Conectado" : "Fallback local"}</Badge>
          <Badge tone={status?.configured ? "success" : "danger"}>{status?.configured ? "Credenciales listas" : "Faltan credenciales"}</Badge>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-300">
          <div className="flex items-center justify-between rounded-2xl bg-slate-950/45 px-4 py-3">
            <span className="inline-flex items-center gap-2"><CloudSun className="h-4 w-4 text-cyan-300" /> Provider activo</span>
            <span className="font-semibold text-white">{status?.provider ?? "..."}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-950/45 px-4 py-3">
            <span>Calendar ID</span>
            <span className="max-w-[220px] truncate font-semibold text-white">{status?.calendarId ?? "primary"}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-950/45 px-4 py-3">
            <span>Sesión</span>
            <span className="font-semibold text-white">{connected ? "Token activo" : "Sin autorización"}</span>
          </div>
        </div>

        {feedback ? <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">{feedback}</p> : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleConnect} disabled={!status?.configured || loading}>
            <CalendarCheck2 className="h-4 w-4" /> {connected ? "Reconectar" : "Conectar Google"}
          </Button>
          <Button variant="secondary" onClick={() => void loadStatus()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" /> Refrescar estado
          </Button>
          <Button variant="danger" onClick={() => void handleDisconnect()} disabled={!connected || loading}>
            <CalendarX2 className="h-4 w-4" /> Desconectar
          </Button>
        </div>
      </div>
    </Card>
  );
}
