import { NextRequest, NextResponse } from "next/server";

declare global {
  // eslint-disable-next-line no-var
  var __barbershopInboundWebhookEvents: Array<{ receivedAt: string; payload: unknown }> | undefined;
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  if (!globalThis.__barbershopInboundWebhookEvents) {
    globalThis.__barbershopInboundWebhookEvents = [];
  }

  globalThis.__barbershopInboundWebhookEvents.unshift({
    receivedAt: new Date().toISOString(),
    payload
  });

  globalThis.__barbershopInboundWebhookEvents = globalThis.__barbershopInboundWebhookEvents.slice(0, 20);

  return NextResponse.json({
    success: true,
    receivedAt: new Date().toISOString(),
    message: "Webhook recibido y listo para flujos bidireccionales futuros."
  });
}
