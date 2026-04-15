import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleCalendarConfig, isGoogleCalendarConfigured, resolveGoogleRedirectUri } from "@/lib/google-calendar-oauth";
import { setGoogleOauthStateCookie } from "@/lib/google-calendar-session";

export async function GET(request: NextRequest) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      {
        connected: false,
        error: "Google Calendar no está configurado. Define GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET."
      },
      { status: 503 }
    );
  }

  const { clientId } = getGoogleCalendarConfig();
  const redirectUri = resolveGoogleRedirectUri(request);
  const state = randomUUID();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  setGoogleOauthStateCookie(response, state);

  return response;
}
