import type { NextRequest } from "next/server";

export function getGoogleCalendarConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID ?? "primary"
  };
}

export function isGoogleCalendarConfigured() {
  const config = getGoogleCalendarConfig();
  return Boolean(config.clientId && config.clientSecret);
}

export function resolveGoogleRedirectUri(request: NextRequest) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  const requestUrl = new URL(request.url);
  return `${requestUrl.origin}/api/integrations/google/callback`;
}
