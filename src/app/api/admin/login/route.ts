import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

/**
 * The email/password fallback into the admin panel.
 *
 * This is a single shared static credential, which is weak by construction — it
 * exists so the owner is never locked out if Google sign-in breaks. It is worth
 * deleting once the Google path is trusted. Until then it gets the two defences
 * a shared password most needs: no timing signal, and a hard cap on guesses.
 */

/** Constant-time compare that does not leak length through an early return. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // Still burn a comparison so a wrong length is not measurably faster.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

// Per-IP attempt counter. In-memory, so it resets on a cold start and is not
// shared across serverless instances — it will not stop a determined
// distributed attack, but it does turn "unlimited guesses from one host" into
// something that has to work far harder. A durable limiter belongs in the
// database if this route survives.
const ATTEMPTS = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = ATTEMPTS.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    ATTEMPTS.set(ip, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const { email, password } = await req.json().catch(() => ({}));
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const ok =
    typeof email === "string" &&
    typeof password === "string" &&
    safeEqual(email.trim().toLowerCase(), adminEmail.trim().toLowerCase()) &&
    safeEqual(password, adminPassword);

  if (ok) {
    // A success clears the counter so a working admin is never locked out by
    // their own earlier typos.
    ATTEMPTS.delete(ip);
    (await cookies()).set("admin", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
