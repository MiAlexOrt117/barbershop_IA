import { NextRequest, NextResponse } from "next/server";
import type { DomainEvent } from "@/lib/domain-events";
import { getWebhookDispatcher } from "@/lib/make-dispatcher";

export async function POST(request: NextRequest) {
  const event = (await request.json()) as DomainEvent;
  const webhookUrl = process.env.MAKE_WEBHOOK_URL ?? process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      {
        success: false,
        skipped: true,
        reason: "MAKE_WEBHOOK_URL is not configured"
      },
      { status: 202 }
    );
  }

  const dispatcher = getWebhookDispatcher();
  const log = await dispatcher.dispatch(event);

  return NextResponse.json({
    success: log.status === "delivered",
    log
  });
}
