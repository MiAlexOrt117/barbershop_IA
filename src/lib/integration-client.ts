import type { Appointment, BusinessSettings } from "./types";

export interface CalendarSyncPayload {
  action: "create" | "update" | "cancel";
  appointment: Appointment;
  settings: Pick<BusinessSettings, "name" | "address" | "timezone">;
}

export interface CalendarSyncApiResponse {
  success: boolean;
  provider: "local" | "google";
  configured?: boolean;
  calendarId?: string | null;
  googleEventId?: string | null;
  externalEventId?: string;
  eventUrl?: string;
  error?: string;
  syncedAt: string;
}

export interface GoogleCalendarStatusResponse {
  configured: boolean;
  connected: boolean;
  provider: "local" | "google";
  calendarId: string | null;
  expiresAt: number | null;
}

export async function syncAppointmentWithCalendar(payload: CalendarSyncPayload) {
  const response = await fetch("/api/integrations/calendar/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return (await response.json()) as CalendarSyncApiResponse;
}

export async function fetchGoogleCalendarStatus() {
  const response = await fetch("/api/integrations/google/status", {
    method: "GET",
    cache: "no-store"
  });

  return (await response.json()) as GoogleCalendarStatusResponse;
}

export async function disconnectGoogleCalendar() {
  const response = await fetch("/api/integrations/google/status", {
    method: "DELETE"
  });

  return response.json();
}
