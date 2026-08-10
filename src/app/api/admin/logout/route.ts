import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // Both, or a store_manager keeps product CRUD for the cookie's full 7-day life
  // after signing out.
  for (const name of ["admin", "manager"]) {
    cookies().set(name, "", { httpOnly: true, path: "/", maxAge: 0 });
  }
  return NextResponse.json({ ok: true });
}

