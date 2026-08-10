/**
 * FAQ copy. Kept in code for the same reason as the legal pages: it changes
 * rarely, it should be reviewable in a diff, and it feeds the FAQPage JSON-LD
 * without a database round trip.
 */
export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  heading: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    heading: "Paying",
    items: [
      {
        q: "How can I pay?",
        a: "M-Pesa or card, on the same checkout page. You will see both options after you enter a delivery destination.",
      },
      {
        q: "Prices are in dollars — what am I actually charged?",
        a: "Kenyan shillings. The checkout shows the shilling total before you pay, and the conversion rate is fixed at that moment and stored against your order, so it cannot move afterwards.",
      },
      {
        q: "Can I pay on invoice or by purchase order?",
        a: "For established accounts, yes. Add your company name, KRA PIN and PO reference at checkout and we will match the invoice to it. To open an account, send us a quote request first.",
      },
      {
        q: "Do you issue an ETR receipt?",
        a: "Yes, on request for VAT-registered buyers. Include your KRA PIN at checkout and reply to your order confirmation asking for one.",
      },
    ],
  },
  {
    heading: "Delivery",
    items: [
      {
        q: "How long does delivery take?",
        a: "Nairobi is usually next working day for stocked items. Other counties are typically two to four working days by courier. Anything outside Kenya depends on the destination and we confirm before dispatch.",
      },
      {
        q: "Can I collect instead?",
        a: "Yes. Choose Nairobi as the destination and put your preferred pickup point in the courier field, or say so in the delivery instructions and we will arrange it.",
      },
      {
        q: "What if the shipping estimate is wrong?",
        a: "The zone rate at checkout is an estimate. If actual freight comes in materially higher — bulky or heavy items, mostly — we contact you before dispatch rather than surprising you or absorbing it silently.",
      },
    ],
  },
  {
    heading: "Parts and specifications",
    items: [
      {
        q: "Where are the datasheets?",
        a: "On the product page, as a PDF you can view or download without signing in. If a part you need has no datasheet listed, ask and we will get it from the manufacturer.",
      },
      {
        q: "I have a part number from another supplier. Can you match it?",
        a: "Usually. Send the part number and, if you have it, the datasheet. We will tell you whether we stock a direct equivalent or a compatible alternative — and we will say when we do not.",
      },
      {
        q: "Is this part suitable for my application?",
        a: "Tell us what you are building and we will give you an honest answer. Specifications on the site are for reference; the manufacturer's datasheet governs, and final suitability is your call.",
      },
      {
        q: "Do you do bulk or project pricing?",
        a: "Yes. Anything above a handful of units is worth asking about, particularly for a build with a repeat schedule.",
      },
    ],
  },
  {
    heading: "After the order",
    items: [
      {
        q: "How do I track my order?",
        a: "Your confirmation email carries an order number beginning ELF-. Open elffie.com/order and enter that number with the email you ordered under to see its current status and any tracking number.",
      },
      {
        q: "Something arrived damaged or does not work.",
        a: "Email admin@elffie.com within 7 days with your order number and a photo of the item and its label. We replace or refund, and we cover return shipping when the fault is ours.",
      },
      {
        q: "Can I return something I no longer need?",
        a: "Unopened stock items, within 14 days, with return shipping at your cost. Special-order parts, cut cable and opened static-sensitive components cannot be returned — the returns page has the full list.",
      },
    ],
  },
];
