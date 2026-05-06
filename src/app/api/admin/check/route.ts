import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = cookies().get("admin")?.value === "1";
  const isManager = cookies().get("manager")?.value === "1";
  return NextResponse.json({ isAdmin, isManager });
}
