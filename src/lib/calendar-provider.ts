import type { CalendarProviderName } from "./types";
import type { GoogleCalendarSession } from "./google-calendar-session";

/**
 * Calendar Provider Abstraction
 *
 * This interface allows swapping between different calendar providers
 * (local, Google Calendar, Outlook, etc.) without changing business logic.
 */

export interface CalendarEvent {
  id: string;
  externalId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
  color?: string;
  busy: boolean;
  metadata?: Record<string, string>;
}

export interface CalendarSyncResult {
  success: boolean;
  provider: CalendarProviderName;
  externalEventId?: string;
  eventUrl?: string;
  error?: string;
  syncedAt: string;
}

export interface ICalendarProvider {
  name: CalendarProviderName;
  isAuthenticated(): boolean;
  authenticate(credentials: Record<string, string>): Promise<void>;
  createEvent(event: CalendarEvent): Promise<CalendarSyncResult>;
  updateEvent(externalEventId: string, event: CalendarEvent): Promise<CalendarSyncResult>;
  deleteEvent(externalEventId: string): Promise<CalendarSyncResult>;
  listEvents(startTime: string, endTime: string): Promise<CalendarEvent[]>;
  getEvent(externalEventId: string): Promise<CalendarEvent | null>;
  watchChanges?(calendarId: string): Promise<string>;
  unwatchChanges?(watchChannelId: string): Promise<void>;
}

const googleEventColorMap: Record<string, string> = {
  pending: "9",
  completed: "10",
  cancelled: "11",
  "no-show": "6",
  "walk-in": "5",
  blocked: "8"
};

export class LocalCalendarProvider implements ICalendarProvider {
  name: CalendarProviderName = "local";
  private static events = new Map<string, CalendarEvent>();

  isAuthenticated(): boolean {
    return true;
  }

  async authenticate(): Promise<void> {
    return;
  }

  async createEvent(event: CalendarEvent): Promise<CalendarSyncResult> {
    const id = event.externalId ?? `local-${Date.now()}`;
    LocalCalendarProvider.events.set(id, { ...event, externalId: id });

    return {
      success: true,
      provider: "local",
      externalEventId: id,
      syncedAt: new Date().toISOString()
    };
  }

  async updateEvent(externalEventId: string, event: CalendarEvent): Promise<CalendarSyncResult> {
    LocalCalendarProvider.events.set(externalEventId, { ...event, externalId: externalEventId });

    return {
      success: true,
      provider: "local",
      externalEventId,
      syncedAt: new Date().toISOString()
    };
  }

  async deleteEvent(externalEventId: string): Promise<CalendarSyncResult> {
    LocalCalendarProvider.events.delete(externalEventId);

    return {
      success: true,
      provider: "local",
      externalEventId,
      syncedAt: new Date().toISOString()
    };
  }

  async listEvents(startTime: string, endTime: string): Promise<CalendarEvent[]> {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    return Array.from(LocalCalendarProvider.events.values()).filter((event) => {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();
      return eventStart < end && eventEnd > start;
    });
  }

  async getEvent(externalEventId: string): Promise<CalendarEvent | null> {
    return LocalCalendarProvider.events.get(externalEventId) ?? null;
  }
}

export class GoogleCalendarProvider implements ICalendarProvider {
  name: CalendarProviderName = "google";

  constructor(private session: GoogleCalendarSession) {}

  isAuthenticated(): boolean {
    return Boolean(this.session.accessToken && this.session.refreshToken);
  }

  getSession() {
    return this.session;
  }

  async authenticate(credentials: Record<string, string>): Promise<void> {
    this.session = {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: Number(credentials.expiresAt),
      scope: credentials.scope ?? "https://www.googleapis.com/auth/calendar",
      tokenType: credentials.tokenType ?? "Bearer",
      calendarId: credentials.calendarId ?? process.env.GOOGLE_CALENDAR_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID ?? "primary"
    };
  }

  async createEvent(event: CalendarEvent): Promise<CalendarSyncResult> {
    const response = await this.request<{ id: string; htmlLink?: string }>("POST", "/events", {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime,
        timeZone: process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Bogota"
      },
      end: {
        dateTime: event.endTime,
        timeZone: process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Bogota"
      },
      attendees: event.attendees?.map((email) => ({ email })),
      transparency: event.busy ? "opaque" : "transparent",
      colorId: event.color ? googleEventColorMap[event.color] : undefined,
      extendedProperties: event.metadata ? { private: event.metadata } : undefined
    });

    return {
      success: true,
      provider: "google",
      externalEventId: response.id,
      eventUrl: response.htmlLink,
      syncedAt: new Date().toISOString()
    };
  }

  async updateEvent(externalEventId: string, event: CalendarEvent): Promise<CalendarSyncResult> {
    const response = await this.request<{ id: string; htmlLink?: string }>("PUT", `/events/${encodeURIComponent(externalEventId)}`, {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime,
        timeZone: process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Bogota"
      },
      end: {
        dateTime: event.endTime,
        timeZone: process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Bogota"
      },
      attendees: event.attendees?.map((email) => ({ email })),
      transparency: event.busy ? "opaque" : "transparent",
      colorId: event.color ? googleEventColorMap[event.color] : undefined,
      extendedProperties: event.metadata ? { private: event.metadata } : undefined
    });

    return {
      success: true,
      provider: "google",
      externalEventId: response.id,
      eventUrl: response.htmlLink,
      syncedAt: new Date().toISOString()
    };
  }

  async deleteEvent(externalEventId: string): Promise<CalendarSyncResult> {
    await this.request("DELETE", `/events/${encodeURIComponent(externalEventId)}`);

    return {
      success: true,
      provider: "google",
      externalEventId,
      syncedAt: new Date().toISOString()
    };
  }

  async listEvents(startTime: string, endTime: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin: startTime,
      timeMax: endTime,
      singleEvents: "true",
      orderBy: "startTime"
    });

    const response = await this.request<{ items?: Array<Record<string, unknown>> }>("GET", `/events?${params.toString()}`);

    return (response.items ?? []).map((item) => ({
      id: String(item.id ?? ""),
      externalId: String(item.id ?? ""),
      title: String(item.summary ?? ""),
      description: typeof item.description === "string" ? item.description : undefined,
      startTime: String((item.start as { dateTime?: string }).dateTime ?? ""),
      endTime: String((item.end as { dateTime?: string }).dateTime ?? ""),
      location: typeof item.location === "string" ? item.location : undefined,
      busy: item.transparency !== "transparent"
    }));
  }

  async getEvent(externalEventId: string): Promise<CalendarEvent | null> {
    try {
      const response = await this.request<Record<string, unknown>>("GET", `/events/${encodeURIComponent(externalEventId)}`);

      return {
        id: String(response.id ?? externalEventId),
        externalId: String(response.id ?? externalEventId),
        title: String(response.summary ?? ""),
        description: typeof response.description === "string" ? response.description : undefined,
        startTime: String(((response.start as { dateTime?: string } | undefined)?.dateTime) ?? ""),
        endTime: String(((response.end as { dateTime?: string } | undefined)?.dateTime) ?? ""),
        location: typeof response.location === "string" ? response.location : undefined,
        busy: response.transparency !== "transparent"
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  async watchChanges(calendarId: string): Promise<string> {
    const response = await this.request<{ id: string }>("POST", `/events/watch`, {
      id: crypto.randomUUID(),
      type: "web_hook",
      address: process.env.GOOGLE_WATCH_WEBHOOK_URL,
      params: {
        ttl: "86400"
      }
    }, calendarId);

    return response.id;
  }

  async unwatchChanges(watchChannelId: string): Promise<void> {
    await this.request("POST", "/channels/stop", { id: watchChannelId, resourceId: watchChannelId });
  }

  private async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    calendarId = this.session.calendarId
  ): Promise<T> {
    await this.ensureAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.session.accessToken}`,
          "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store"
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google Calendar API ${response.status}: ${errorBody}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  private async ensureAccessToken() {
    if (Date.now() < this.session.expiresAt - 60_000) {
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google Calendar credentials are not configured.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: this.session.refreshToken
      }),
      cache: "no-store"
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Unable to refresh Google access token: ${errorBody}`);
    }

    const tokenPayload = (await tokenResponse.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
      scope?: string;
    };

    this.session = {
      ...this.session,
      accessToken: tokenPayload.access_token,
      expiresAt: Date.now() + tokenPayload.expires_in * 1000,
      tokenType: tokenPayload.token_type,
      scope: tokenPayload.scope ?? this.session.scope
    };
  }
}

export class CalendarProviderFactory {
  static create(providerName: CalendarProviderName = "local", options?: { session?: GoogleCalendarSession | null }): ICalendarProvider {
    if (providerName === "google" && options?.session) {
      return new GoogleCalendarProvider(options.session);
    }

    return new LocalCalendarProvider();
  }
}
