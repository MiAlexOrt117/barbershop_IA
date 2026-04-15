import { IdempotencyStore, WebhookDispatcher } from "./webhooks";

declare global {
  // eslint-disable-next-line no-var
  var __barbershopWebhookDispatcher: WebhookDispatcher | undefined;
  // eslint-disable-next-line no-var
  var __barbershopWebhookIdempotency: IdempotencyStore | undefined;
}

export function getWebhookDispatcher() {
  if (!globalThis.__barbershopWebhookIdempotency) {
    globalThis.__barbershopWebhookIdempotency = new IdempotencyStore();
  }

  if (!globalThis.__barbershopWebhookDispatcher) {
    globalThis.__barbershopWebhookDispatcher = new WebhookDispatcher(
      {
        url: process.env.MAKE_WEBHOOK_URL ?? process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL ?? "",
        secret: process.env.MAKE_WEBHOOK_SECRET ?? process.env.MAKE_API_KEY,
        retryCount: Number(process.env.MAKE_WEBHOOK_RETRY_COUNT ?? 3),
        retryDelayMs: Number(process.env.MAKE_WEBHOOK_RETRY_DELAY_MS ?? 800),
        timeout: Number(process.env.MAKE_WEBHOOK_TIMEOUT_MS ?? 10000)
      },
      globalThis.__barbershopWebhookIdempotency
    );
  }

  return globalThis.__barbershopWebhookDispatcher;
}
