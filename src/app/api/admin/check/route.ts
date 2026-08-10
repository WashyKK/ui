import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const isAdmin = jar.get("admin")?.value === "1";
  const isManager = jar.get("manager")?.value === "1";
  return NextResponse.json({ isAdmin, isManager });
}
