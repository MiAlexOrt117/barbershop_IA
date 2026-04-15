import { NextRequest, NextResponse } from "next/server";
import { getGoogleCalendarConfig, isGoogleCalendarConfigured, resolveGoogleRedirectUri } from "@/lib/google-calendar-oauth";
import {
  clearGoogleOauthStateCookie,
  setGoogleSessionCookie
} from "@/lib/google-calendar-session";

function buildPopupResponse(payload: { success: boolean; message: string }) {
  return new NextResponse(
    `<!doctype html>
<html lang="es">
  <body style="font-family: Inter, Arial, sans-serif; background:#08111f; color:#fff; display:grid; place-items:center; min-height:100vh; margin:0;">
    <div style="max-width:420px; padding:24px; border-radius:24px; border:1px solid rgba(255,255,255,0.12); background:rgba(15,23,42,0.85);">
      <h1 style="margin:0 0 12px; font-size:22px;">${payload.success ? "Google Calendar conectado" : "No se pudo conectar Google Calendar"}</h1>
      <p style="margin:0; color:rgba(226,232,240,0.8); line-height:1.6;">${payload.message}</p>
      <p style="margin-top:16px; color:rgba(148,163,184,0.7); font-size:13px;">Puedes cerrar esta ventana.</p>
    </div>
    <script>
      if (window.opener) {
        window.opener.postMessage(${JSON.stringify({ type: "google-calendar-auth", ...payload })}, window.location.origin);
      }
      setTimeout(() => window.close(), 800);
    </script>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    }
  );
}

export async function GET(request: NextRequest) {
  if (!isGoogleCalendarConfigured()) {
    return buildPopupResponse({
      success: false,
      message: "Faltan credenciales del lado del servidor."
    });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get("barbershop_google_oauth_state")?.value;

  if (error) {
    const response = buildPopupResponse({
      success: false,
      message: `Google devolvió un error: ${error}.`
    });
    clearGoogleOauthStateCookie(response);
    return response;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = buildPopupResponse({
      success: false,
      message: "La validación del flujo OAuth falló. Reintenta la conexión."
    });
    clearGoogleOauthStateCookie(response);
    return response;
  }

  const { clientId, clientSecret, calendarId } = getGoogleCalendarConfig();
  const redirectUri = resolveGoogleRedirectUri(request);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }),
    cache: "no-store"
  });

  if (!tokenResponse.ok) {
    const tokenError = await tokenResponse.text();
    const response = buildPopupResponse({
      success: false,
      message: `No se pudo intercambiar el código OAuth: ${tokenError}`
    });
    clearGoogleOauthStateCookie(response);
    return response;
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };

  if (!tokenPayload.refresh_token) {
    const response = buildPopupResponse({
      success: false,
      message: "Google no devolvió refresh token. Repite la conexión y asegúrate de aceptar el consentimiento."
    });
    clearGoogleOauthStateCookie(response);
    return response;
  }

  const response = buildPopupResponse({
    success: true,
    message: "La barbería ya puede crear, actualizar y cancelar eventos reales en Google Calendar."
  });

  setGoogleSessionCookie(response, {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    expiresAt: Date.now() + tokenPayload.expires_in * 1000,
    scope: tokenPayload.scope,
    tokenType: tokenPayload.token_type,
    calendarId
  });
  clearGoogleOauthStateCookie(response);

  return response;
}
