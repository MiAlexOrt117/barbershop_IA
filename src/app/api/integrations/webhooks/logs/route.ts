import { NextResponse } from "next/server";
import { getWebhookDispatcher } from "@/lib/make-dispatcher";

export async function GET() {
  const dispatcher = getWebhookDispatcher();
  const webhookUrl = process.env.MAKE_WEBHOOK_URL ?? process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL ?? "";

  return NextResponse.json({
    configured: Boolean(webhookUrl),
    webhookUrl: webhookUrl ? `${webhookUrl.slice(0, 28)}...` : null,
    logs: dispatcher.getDeliveryLogs().sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))
  });
}
