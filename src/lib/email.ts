import "server-only";
import { Resend } from "resend";
import { getShippingLabel } from "./shipping";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Overridable, because the sending domain has to be verified in Resend and
// "orders@" is the wrong sender for a staff invite.
const FROM = process.env.RESEND_FROM || "Elffie Robotics <orders@elffie.com>";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface SendOrderConfirmationParams {
  to: string;
  orderRef: string;
  items: OrderItem[];
  subtotalUsd: number;
  shippingUsd: number;
  shippingZone: string;
  paymentMethod: "paystack" | "stripe" | "mpesa";
  /** M-Pesa receipt or card reference, whichever the provider gave us. */
  receipt?: string;
}

const PAYMENT_LABELS: Record<SendOrderConfirmationParams["paymentMethod"], string> = {
  paystack: "M-Pesa or card",
  stripe: "Card",
  mpesa: "M-Pesa",
};

/** Whether outbound mail can actually be sent. Callers surface this rather than pretending. */
export function isEmailConfigured(): boolean {
  return Boolean(resend);
}

interface SendStaffInviteParams {
  to: string;
  role: "admin" | "store_manager";
  /** Where they sign in — the invite is useless without it. */
  signInUrl: string;
  invitedBy?: string | null;
}

const ROLE_COPY = {
  admin: {
    title: "platform admin",
    can: [
      "Add, edit and remove products",
      "Manage categories",
      "See and fulfil orders",
      "Invite other admins and store managers",
    ],
  },
  store_manager: {
    title: "store manager",
    can: [
      "Add, edit and remove products",
      "Upload images and datasheets",
      "See and fulfil orders",
    ],
  },
} as const;

/**
 * Tell someone they have been given access.
 *
 * There is no accept-token: the grant is already live against their email
 * address, so this is a notification and a sign-in link rather than an
 * invitation they have to redeem. That means a lost email costs nothing —
 * they can still sign in — but it also means the address must be right.
 */
export async function sendStaffInvite({
  to, role, signInUrl, invitedBy,
}: SendStaffInviteParams): Promise<boolean> {
  if (!resend) {
    console.warn(`RESEND_API_KEY unset — no invite email sent to ${to}`);
    return false;
  }

  const copy = ROLE_COPY[role];
  const items = copy.can
    .map((line) => `<li style="margin-bottom:4px">${line}</li>`)
    .join("");

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You have been added to Elffie Robotics as a ${copy.title}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f3f5;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border:1px solid #e3e5e8">
    <div style="background:#1a1c1f;padding:24px 28px">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;letter-spacing:-0.02em">Elffie Robotics</h1>
      <p style="margin:4px 0 0;color:#8a8f94;font-size:12px">Staff access</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;color:#1a1c1f;font-size:15px">
        ${invitedBy ? `${invitedBy} has given` : "You have been given"} you
        <strong>${copy.title}</strong> access to the Elffie Robotics store.
      </p>
      <p style="margin:0 0 8px;color:#8a8f94;font-size:13px">You can:</p>
      <ul style="margin:0 0 22px;padding-left:18px;color:#3d4146;font-size:13px">${items}</ul>
      <a href="${signInUrl}" style="display:inline-block;background:#1a1c1f;color:#fff;padding:11px 20px;font-size:14px;text-decoration:none">Sign in</a>
      <p style="margin:22px 0 0;font-size:12px;color:#8a8f94">
        Sign in with Google using <strong style="color:#3d4146">${to}</strong> — access is tied to
        that address. There is nothing to accept; it works the first time you sign in.
      </p>
      <p style="margin:12px 0 0;font-size:12px;color:#8a8f94">
        Not expecting this? Ignore it, or reply to have the access removed.
      </p>
    </div>
  </div>
</body>
</html>`,
    });
    return true;
  } catch (err: any) {
    console.error(`Invite email to ${to} failed:`, err?.message);
    return false;
  }
}

interface SendBackInStockParams {
  to: string;
  productName: string;
  productUrl: string;
  stock: number;
}

export async function sendBackInStock({
  to, productName, productUrl, stock,
}: SendBackInStockParams) {
  if (!resend) {
    console.warn(`RESEND_API_KEY unset — no back-in-stock email for ${productName}`);
    return;
  }

  // Deliberately blunt about scarcity, because it is true: these are often the
  // only units in the country, and the person waiting asked to be told.
  const scarcity =
    stock <= 3
      ? `Only ${stock} ${stock === 1 ? "unit" : "units"} came in, so it may not last.`
      : `${stock} units are available.`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Back in stock — ${productName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f3f5;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border:1px solid #e3e5e8">
    <div style="background:#1a1c1f;padding:24px 28px">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;letter-spacing:-0.02em">Elffie Robotics</h1>
      <p style="margin:4px 0 0;color:#8a8f94;font-size:12px">Back in stock</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 6px;color:#1a1c1f;font-size:16px;font-weight:500">${productName}</p>
      <p style="margin:0 0 20px;color:#8a8f94;font-size:14px">${scarcity}</p>
      <a href="${productUrl}" style="display:inline-block;background:#1a1c1f;color:#fff;padding:11px 20px;font-size:14px;text-decoration:none">View the part</a>
      <p style="margin:24px 0 0;font-size:12px;color:#8a8f94">
        You asked to be told when this came back. This is a one-off — we will not
        email you about it again unless you ask us to.
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

export async function sendOrderConfirmation(params: SendOrderConfirmationParams) {
  // Without a key this is a no-op, which is why a broken email pipeline can go
  // unnoticed — the caller sees success either way. Set RESEND_API_KEY.
  if (!resend) {
    console.warn(`RESEND_API_KEY unset — no confirmation sent for ${params.orderRef}`);
    return;
  }

  const {
    to, orderRef, items, subtotalUsd, shippingUsd, shippingZone,
    paymentMethod, receipt,
  } = params;

  const totalUSD = subtotalUsd + shippingUsd;
  const subtotalUSD = subtotalUsd;
  const shippingUSD = shippingUsd;
  const shippingLabel = getShippingLabel(shippingZone);
  const paymentLabel = `${PAYMENT_LABELS[paymentMethod]}${receipt ? ` (${receipt})` : ""}`;

  const itemRows = items.map((i) =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
    </tr>`
  ).join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#0f172a;padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Elffie Robotics</h1>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:13px">Order Confirmation</p>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 4px;color:#374151;font-size:15px">Thanks for your order!</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:13px">Reference: <strong>${orderRef}</strong></p>

      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="color:#6b7280;font-size:12px;text-transform:uppercase">
            <th style="text-align:left;padding-bottom:8px;font-weight:500">Item</th>
            <th style="text-align:center;padding-bottom:8px;font-weight:500">Qty</th>
            <th style="text-align:right;padding-bottom:8px;font-weight:500">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:16px;padding-top:16px;border-top:2px solid #f0f0f0">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:6px">
          <span>Subtotal</span><span>$${subtotalUSD.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:12px">
          <span>Shipping — ${shippingLabel}</span>
          <span>${shippingUSD > 0 ? `$${shippingUSD.toFixed(2)}` : "Free"}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:600;color:#111827">
          <span>Total</span><span>$${totalUSD.toFixed(2)}</span>
        </div>
      </div>

      <div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border-radius:8px;font-size:13px;color:#6b7280">
        <p style="margin:0 0 4px"><strong style="color:#374151">Payment:</strong> ${paymentLabel}</p>
        <p style="margin:0"><strong style="color:#374151">Shipping to:</strong> ${shippingLabel}</p>
      </div>

      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af">
        We'll reach out via email to coordinate delivery details. For questions contact
        <a href="mailto:admin@elffie.com" style="color:#6366f1">admin@elffie.com</a>.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
      Elffie Robotics · elffie.com
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Order confirmed — ${orderRef}`,
    html,
  });
}
