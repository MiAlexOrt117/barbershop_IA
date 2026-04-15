import { NextRequest, NextResponse } from "next/server";
import { CalendarProviderFactory, GoogleCalendarProvider, type CalendarEvent, type CalendarSyncResult } from "@/lib/calendar-provider";
import { getGoogleCalendarConfig, isGoogleCalendarConfigured } from "@/lib/google-calendar-oauth";
import {
  GOOGLE_SESSION_COOKIE,
  setGoogleSessionCookie,
  unsealGoogleSession
} from "@/lib/google-calendar-session";
import type { Appointment, BusinessSettings } from "@/lib/types";

type AppointmentCalendarAction = "create" | "update" | "cancel";

function buildCalendarEvent(appointment: Appointment, settings: Pick<BusinessSettings, "name" | "address" | "timezone">): CalendarEvent {
  const descriptionLines = [
    `Cliente: ${appointment.clientName || "Bloqueo operativo"}`,
    appointment.clientPhone ? `Teléfono: ${appointment.clientPhone}` : null,
    `Servicio: ${appointment.serviceName}`,
    `Barbero: ${appointment.barberName}`,
    `Estado: ${appointment.status}`,
    appointment.notes ? `Notas: ${appointment.notes}` : null,
    `Origen: ${appointment.source}`
  ].filter(Boolean);

  return {
    id: appointment.id,
    externalId: appointment.googleEventId ?? appointment.externalEventId ?? undefined,
    title:
      appointment.status === "blocked"
        ? `${settings.name} · Bloqueo de agenda`
        : `${appointment.clientName} · ${appointment.serviceName}`,
    description: descriptionLines.join("\n"),
    startTime: appointment.start,
    endTime: appointment.end,
    location: settings.address,
    busy: appointment.status !== "cancelled",
    color: appointment.status,
    metadata: {
      appointmentId: appointment.id,
      barberId: appointment.barberId ?? "unassigned",
      status: appointment.status,
      source: appointment.source
    }
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    action: AppointmentCalendarAction;
    appointment: Appointment;
    settings: Pick<BusinessSettings, "name" | "address" | "timezone">;
  };

  const session = unsealGoogleSession(request.cookies.get(GOOGLE_SESSION_COOKIE)?.value);
  const googleEnabled = Boolean(session && isGoogleCalendarConfigured());
  const provider = CalendarProviderFactory.create(googleEnabled ? "google" : "local", {
    session: googleEnabled ? session : null
  });

  try {
    let result: CalendarSyncResult;
    const event = buildCalendarEvent(body.appointment, {
      ...body.settings,
      timezone: body.settings.timezone || process.env.NEXT_PUBLIC_TIMEZONE || "America/Bogota"
    });

    if (body.action === "create") {
      result = await provider.createEvent(event);
    } else if (body.action === "cancel") {
      const externalEventId = body.appointment.googleEventId ?? body.appointment.externalEventId;
      result = externalEventId
        ? await provider.deleteEvent(externalEventId)
        : {
            success: true,
            provider: provider.name,
            syncedAt: new Date().toISOString()
          };
    } else {
      const externalEventId = body.appointment.googleEventId ?? body.appointment.externalEventId;
      result = externalEventId ? await provider.updateEvent(externalEventId, event) : await provider.createEvent(event);
    }

    const response = NextResponse.json({
      ...result,
      configured: isGoogleCalendarConfigured(),
      calendarId: session?.calendarId ?? getGoogleCalendarConfig().calendarId,
      googleEventId: result.externalEventId ?? body.appointment.googleEventId ?? body.appointment.externalEventId ?? null
    });

    if (provider instanceof GoogleCalendarProvider) {
      setGoogleSessionCookie(response, provider.getSession());
    }

    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        success: false,
        provider: provider.name,
        error: error instanceof Error ? error.message : "Unexpected calendar sync error",
        syncedAt: new Date().toISOString()
      },
      { status: 500 }
    );

    if (provider instanceof GoogleCalendarProvider) {
      setGoogleSessionCookie(response, provider.getSession());
    }

    return response;
  }
}
