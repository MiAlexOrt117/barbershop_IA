"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCcw, Webhook } from "lucide-react";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";

interface WebhookLogsResponse {
  configured: boolean;
  webhookUrl: string | null;
  logs: Array<{
    id: string;
    eventId: string;
    eventType: string;
    status: "pending" | "delivered" | "failed" | "retrying";
    statusCode?: number;
    error?: string;
    attempts: number;
    createdAt: string;
    deliveredAt?: string;
  }>;
}

const toneByStatus: Record<WebhookLogsResponse["logs"][number]["status"], "default" | "success" | "warning" | "danger" | "muted"> = {
  pending: "warning",
  delivered: "success",
  failed: "danger",
  retrying: "default"
};

export function MakeWebhookCard() {
  const [data, setData] = useState<WebhookLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);

    try {
      const response = await fetch("/api/integrations/webhooks/logs", {
        method: "GET",
        cache: "no-store"
      });

      const payload = (await response.json()) as WebhookLogsResponse;
      setData(payload);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <Card>
      <SectionTitle eyebrow="Automatización real" title="Make Webhooks" subtitle="Domain events entregados vía POST con retry, firma HMAC e idempotencia." />

      <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={data?.configured ? "success" : "danger"}>{data?.configured ? "Webhook configurado" : "Sin webhook"}</Badge>
          <Badge tone="default">{data?.logs.length ?? 0} entregas registradas</Badge>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
          <span className="inline-flex items-center gap-2 text-slate-400"><Webhook className="h-4 w-4" /> Endpoint Make</span>
          <p className="mt-1 font-semibold text-white">{data?.webhookUrl ?? "Configura MAKE_WEBHOOK_URL para activar envíos reales."}</p>
        </div>

        <div className="mt-4 space-y-3">
          {(data?.logs ?? []).slice(0, 4).map((log) => (
            <div key={log.id} className="rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{log.eventType}</p>
                  <p className="text-xs text-slate-400">Intentos: {log.attempts} · Event ID: {log.eventId}</p>
                </div>
                <Badge tone={toneByStatus[log.status]}>{log.status}</Badge>
              </div>
              {log.error ? <p className="mt-2 text-xs text-rose-200">{log.error}</p> : null}
            </div>
          ))}

          {data?.logs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
              Crea o cambia una cita para empezar a ver entregas reales hacia Make.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void loadLogs()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" /> Refrescar logs
          </Button>
          <Button variant="ghost" onClick={() => window.open("https://www.make.com/en/help/tools/webhooks", "_blank", "noopener,noreferrer")}>
            <ArrowUpRight className="h-4 w-4" /> Docs Make
          </Button>
        </div>
      </div>
    </Card>
  );
}
