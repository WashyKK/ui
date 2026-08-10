import { Resend } from "resend";
import { getShippingLabel } from "./shipping";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
    from: "Elffie Robotics <orders@elffie.com>",
    to,
    subject: `Order confirmed — ${orderRef}`,
    html,
  });
}
