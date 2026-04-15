import {
  DOMAIN_EVENT_TYPES,
  InMemoryDomainEventBus,
  type DomainEvent,
  type IDomainEventHandler
} from "./domain-events";

class WebhookRouteHandler implements IDomainEventHandler {
  async handle(event: DomainEvent) {
    await fetch("/api/integrations/events/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });
  }
}

const eventBus = new InMemoryDomainEventBus();
const handler = new WebhookRouteHandler();

DOMAIN_EVENT_TYPES.forEach((eventType) => {
  eventBus.subscribe(eventType, handler);
});

export async function publishDomainEvent(event: DomainEvent) {
  if (typeof window === "undefined") {
    return;
  }

  await eventBus.publish(event);
}
