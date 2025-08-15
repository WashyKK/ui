import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  if (email === adminEmail && password === adminPassword) {
    cookies().set("admin", "1", {
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

