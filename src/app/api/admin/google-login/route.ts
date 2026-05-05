import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!email || !adminEmail || email.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  cookies().set("admin", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
