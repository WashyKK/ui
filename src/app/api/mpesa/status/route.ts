import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { queryStatus } from "@/lib/mpesa";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const checkoutRequestId = searchParams.get("checkoutRequestId");
  if (!checkoutRequestId) {
    return NextResponse.json({ error: "checkoutRequestId required" }, { status: 400 });
  }

  // First check our own DB
  const { data: order } = await supabaseServer
    .from("mpesa_orders")
    .select("status, mpesa_receipt, result_desc, amount")
    .eq("checkout_request_id", checkoutRequestId)
    .single();

  if (order?.status === "completed") {
    return NextResponse.json({ status: "completed", receipt: order.mpesa_receipt, amount: order.amount });
  }
  if (order?.status === "failed") {
    return NextResponse.json({ status: "failed", message: order.result_desc });
  }

  // Still pending — query Daraja directly
  try {
    const result = await queryStatus(checkoutRequestId);
    if (result.ResultCode === "0" || result.ResultCode === 0) {
      return NextResponse.json({ status: "completed" });
    }
    if (result.ResultCode !== undefined && result.ResultCode !== "0") {
      return NextResponse.json({ status: "failed", message: result.ResultDesc });
    }
  } catch {}

  return NextResponse.json({ status: "pending" });
}
