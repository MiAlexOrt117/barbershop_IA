import { NextRequest, NextResponse } from "next/server";
import { getGoogleCalendarConfig, isGoogleCalendarConfigured } from "@/lib/google-calendar-oauth";
import {
  GOOGLE_SESSION_COOKIE,
  clearGoogleSessionCookie,
  unsealGoogleSession
} from "@/lib/google-calendar-session";

export async function GET(request: NextRequest) {
  const session = unsealGoogleSession(request.cookies.get(GOOGLE_SESSION_COOKIE)?.value);
  const { calendarId } = getGoogleCalendarConfig();

  return NextResponse.json({
    configured: isGoogleCalendarConfigured(),
    connected: Boolean(session),
    provider: session ? "google" : "local",
    calendarId: session?.calendarId ?? calendarId,
    expiresAt: session?.expiresAt ?? null
  });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, provider: "local" });
  clearGoogleSessionCookie(response);
  return response;
}
