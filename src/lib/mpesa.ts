const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.length === 9) return "254" + digits;
  return digits;
}

export function isValidKenyanPhone(phone: string): boolean {
  return /^2547\d{8}$|^2541\d{8}$/.test(normalizePhone(phone));
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

function makeTimestamp(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join("");
}

function makePassword(ts: string): string {
  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`;
  return Buffer.from(raw).toString("base64");
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function stkPush({
  phone,
  amount,
  accountRef,
  description,
  callbackUrl,
}: {
  phone: string;
  amount: number;
  accountRef: string;
  description: string;
  callbackUrl: string;
}): Promise<StkPushResult> {
  const token = await getAccessToken();
  const ts = makeTimestamp();

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: makePassword(ts),
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: accountRef.slice(0, 12),
      TransactionDesc: description.slice(0, 13),
    }),
  });

  const data = await res.json();
  if (data.ResponseCode !== "0") {
    throw new Error(
      data.errorMessage || data.ResponseDescription || "STK Push failed"
    );
  }
  return data as StkPushResult;
}

export async function queryStatus(checkoutRequestId: string) {
  const token = await getAccessToken();
  const ts = makeTimestamp();

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: makePassword(ts),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  return res.json();
}
