/**
 * Webhook Infrastructure for Make Integration
 * 
 * This module handles:
 * 1. Publishing domain events to Make webhooks
 * 2. Event logging and retry strategy
 * 3. Idempotency for duplicate prevention
 */

import { createHmac } from "node:crypto";
import type { DomainEvent } from "./domain-events";

export interface WebhookConfig {
  url: string;
  secret?: string;
  retryCount?: number;
  retryDelayMs?: number;
  timeout?: number;
}

export interface WebhookDeliveryLog {
  id: string;
  eventId: string;
  eventType: string;
  webhookUrl: string;
  status: "pending" | "delivered" | "failed" | "retrying";
  statusCode?: number;
  error?: string;
  attempts: number;
  lastAttemptAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

/**
 * WebhookDispatcher
 * Sends domain events to configured webhooks (Make)
 */
export class WebhookDispatcher {
  private deliveryLogs: Map<string, WebhookDeliveryLog> = new Map();
  private idempotencyStore: IdempotencyStore;

  constructor(private config: WebhookConfig, idempotencyStore = new IdempotencyStore()) {
    this.idempotencyStore = idempotencyStore;
  }

  /**
   * Send an event to the configured webhook
   * Used by Make to receive real-time events
   */
  async dispatch(event: DomainEvent): Promise<WebhookDeliveryLog> {
    const idempotencyKey = event.metadata?.idempotencyKey ?? event.id;
    const existing = this.idempotencyStore.getResult(idempotencyKey);

    if (existing) {
      return existing as WebhookDeliveryLog;
    }

    const logId = `log-${Date.now()}`;
    const log: WebhookDeliveryLog = {
      id: logId,
      eventId: event.id,
      eventType: event.type,
      webhookUrl: this.config.url,
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    this.deliveryLogs.set(logId, log);

    try {
      await this.sendWithRetry(event, log);
      if (log.status === "delivered") {
        this.idempotencyStore.markProcessed(idempotencyKey, log);
      }
    } catch (error) {
      log.status = "failed";
      log.error = error instanceof Error ? error.message : "Unknown error";
    }

    return log;
  }

  /**
   * Send event with exponential backoff retry
   */
  private async sendWithRetry(event: DomainEvent, log: WebhookDeliveryLog): Promise<void> {
    const maxAttempts = this.config.retryCount ?? 3;
    const baseDelayMs = this.config.retryDelayMs ?? 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        log.attempts = attempt;
        log.lastAttemptAt = new Date().toISOString();

        const response = await this.sendEventToWebhook(event);

        if (response.ok) {
          log.status = "delivered";
          log.statusCode = response.status;
          log.deliveredAt = new Date().toISOString();
          return;
        } else {
          log.statusCode = response.status;
          log.error = `HTTP ${response.status}`;

          if (response.status >= 500 || response.status === 429) {
            // Server error or rate limit - retry
            log.status = "retrying";
          } else {
            // Client error - don't retry
            log.status = "failed";
            return;
          }
        }
      } catch (error) {
        log.error = error instanceof Error ? error.message : "Unknown error";
        log.status = attempt < maxAttempts ? "retrying" : "failed";
      }

      // Exponential backoff before retry
      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new Error(`Failed to deliver event after ${maxAttempts} attempts`);
  }

  /**
   * Send the actual HTTP request to the webhook
   */
  private async sendEventToWebhook(event: DomainEvent): Promise<Response> {
    const payload = {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      data: event.data,
      metadata: event.metadata
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Event-Type": event.type,
      "X-Event-ID": event.id,
      "X-Timestamp": event.timestamp,
      "X-Idempotency-Key": event.metadata?.idempotencyKey ?? event.id
    };

    // Add signature if secret is configured
    if (this.config.secret) {
      const signature = this.computeSignature(JSON.stringify(payload));
      headers["X-Signature"] = signature;
    }

    return fetch(this.config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout ?? 10000)
    });
  }

  /**
   * Compute HMAC signature for webhook verification
   * Make can verify this to ensure authenticity
   */
  private computeSignature(payload: string): string {
    if (!this.config.secret) {
      return "";
    }

    return `sha256=${createHmac("sha256", this.config.secret).update(payload).digest("hex")}`;
  }

  /**
   * Get all delivery logs (for monitoring)
   */
  getDeliveryLogs(): WebhookDeliveryLog[] {
    return Array.from(this.deliveryLogs.values());
  }

  /**
   * Get log for specific event
   */
  getDeliveryLog(eventId: string): WebhookDeliveryLog | undefined {
    return Array.from(this.deliveryLogs.values()).find((log) => log.eventId === eventId);
  }
}

/**
 * Idempotency Store
 * Prevents duplicate processing of the same event
 * Used by Make to detect retries
 */
export class IdempotencyStore {
  private processed: Map<string, { processedAt: string; result: unknown }> = new Map();

  /**
   * Check if an idempotency key has been processed
   */
  isProcessed(idempotencyKey: string): boolean {
    return this.processed.has(idempotencyKey);
  }

  /**
   * Mark a key as processed
   */
  markProcessed(idempotencyKey: string, result: unknown): void {
    this.processed.set(idempotencyKey, {
      processedAt: new Date().toISOString(),
      result
    });
  }

  /**
   * Get the result of a previously processed request
   */
  getResult(idempotencyKey: string): unknown {
    return this.processed.get(idempotencyKey)?.result;
  }

  /**
   * Clear old entries (for memory management)
   * Call this periodically to prevent memory leaks
   */
  prune(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    const toDelete: string[] = [];

    this.processed.forEach((value, key) => {
      if (new Date(value.processedAt).getTime() < cutoff) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => this.processed.delete(key));
  }
}
