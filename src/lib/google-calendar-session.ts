import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";

export interface GoogleCalendarSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
  calendarId: string;
}

export const GOOGLE_SESSION_COOKIE = "barbershop_google_session";
export const GOOGLE_OAUTH_STATE_COOKIE = "barbershop_google_oauth_state";

function getEncryptionKey() {
  const secret =
    process.env.APP_ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    "barbershop-ia-local-dev-secret";

  return createHash("sha256").update(secret).digest();
}

function encodeBase64Url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function sealGoogleSession(session: GoogleCalendarSession) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [encodeBase64Url(iv), encodeBase64Url(tag), encodeBase64Url(encrypted)].join(".");
}

export function unsealGoogleSession(value: string | undefined) {
  if (!value) return null;

  try {
    const [ivEncoded, tagEncoded, payloadEncoded] = value.split(".");
    if (!ivEncoded || !tagEncoded || !payloadEncoded) return null;

    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), decodeBase64Url(ivEncoded));
    decipher.setAuthTag(decodeBase64Url(tagEncoded));
    const decrypted = Buffer.concat([decipher.update(decodeBase64Url(payloadEncoded)), decipher.final()]).toString("utf8");
    const session = JSON.parse(decrypted) as GoogleCalendarSession;

    return session;
  } catch {
    return null;
  }
}

export function setGoogleSessionCookie(response: NextResponse, session: GoogleCalendarSession) {
  response.cookies.set({
    name: GOOGLE_SESSION_COOKIE,
    value: sealGoogleSession(session),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearGoogleSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: GOOGLE_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export function setGoogleOauthStateCookie(response: NextResponse, state: string) {
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });
}

export function clearGoogleOauthStateCookie(response: NextResponse) {
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}
