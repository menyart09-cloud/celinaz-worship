import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// A team member's sign-in is deliberately its own thing, separate from
// next-auth: a lost or shared PIN can only ever expose this cookie, never
// the real admin/leader login, and this file never touches `auth.ts` or
// the `users` table. Reuses AUTH_SECRET purely as an HMAC key (not as a
// next-auth JWT) so there's no extra env var to configure in production.
const COOKIE_NAME = "team_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // stays signed in for ~6 months

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export type TeamSession = { rosterId: string; name: string };

function encode(session: TeamSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): TeamSession | null {
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed?.rosterId === "string" && typeof parsed?.name === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function setTeamSession(session: TeamSession) {
  const store = await cookies();
  store.set(COOKIE_NAME, encode(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/team",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearTeamSession() {
  const store = await cookies();
  store.delete({ name: COOKIE_NAME, path: "/team" });
}

export async function getTeamSession(): Promise<TeamSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decode(raw);
}
