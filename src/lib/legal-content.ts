/**
 * Legal copy, in code rather than a CMS.
 *
 * These pages change perhaps twice a year, they must be reviewable in a diff,
 * and both Paystack onboarding and Safaricom go-live ask to see them. A database
 * table would add a moving part for no benefit.
 *
 * This is a starting draft written to be accurate about how the store actually
 * works — pricing in USD charged in KES, courier delivery from Nairobi, no
 * returns on special order. It is not legal advice; have it reviewed before
 * relying on it, and update `updated` when you do.
 */
export interface LegalSection {
  heading: string;
  body: string[];
  list?: string[];
}

export interface LegalPage {
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
}

const UPDATED = "11 August 2026";

const PAGES = {
  terms: {
    title: "Terms of sale",
    summary: "The terms that apply when you buy from Elffie Robotics.",
    updated: UPDATED,
    sections: [
      {
        heading: "Who you are buying from",
        body: [
          "Elffie Robotics supplies industrial sensors, control gear and automation components from Nairobi, Kenya. These terms apply to every order placed through elffie.com.",
        ],
      },
      {
        heading: "Prices and currency",
        body: [
          "Catalogue prices are listed in US dollars and charged in Kenyan shillings. The conversion rate applied to your order is fixed at the moment you pay and is recorded against the order, so a later rate change never alters what you were charged.",
          "Prices exclude delivery unless stated. Where VAT applies it is shown before you pay.",
        ],
      },
      {
        heading: "Placing an order",
        body: [
          "Adding items to your cart is not an order. An order exists once payment has been authorised, and we confirm it by email with an order number beginning ELF-.",
          "We may decline or cancel an order — with a full refund — if an item turns out to be unavailable, if a price was listed in error, or if we cannot verify the delivery details.",
        ],
      },
      {
        heading: "Stock and lead times",
        body: [
          "Stock figures are live but not reserved until payment completes, so an item can sell out between adding it to your cart and paying. If that happens we contact you with a lead time and you may cancel for a full refund.",
        ],
      },
      {
        heading: "Delivery",
        body: [
          "We dispatch by courier. Delivery estimates are estimates, not guarantees, and the final delivery cost is confirmed before dispatch where the quoted zone rate does not cover it.",
          "Risk passes to you on delivery. Check the goods on arrival and tell us within 7 days if anything is damaged or missing.",
        ],
      },
      {
        heading: "Specifications and datasheets",
        body: [
          "Datasheets are published by the manufacturer and provided for reference. Where a datasheet and our product page disagree, the datasheet governs. It is your responsibility to confirm a part is suitable for your application.",
        ],
      },
      {
        heading: "Warranty",
        body: [
          "Goods carry the manufacturer's warranty. We pass through warranty claims but do not extend them. Nothing here limits rights you have under Kenyan consumer law.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Our liability for any order is limited to what you paid for it. We are not liable for indirect losses, including lost production or downtime, arising from the use or failure of goods supplied.",
        ],
      },
    ],
  },

  returns: {
    title: "Returns",
    summary: "When you can return something, and how to do it.",
    updated: UPDATED,
    sections: [
      {
        heading: "The short version",
        body: [
          "If we sent the wrong part, or it arrived damaged or dead, tell us within 7 days and we will replace it or refund you. Change-of-mind returns are accepted within 14 days on unopened stock items.",
        ],
      },
      {
        heading: "What can be returned",
        body: ["Returned goods must be unused, in their original packaging, with any seals intact."],
        list: [
          "Wrong item sent — replaced or refunded in full, return shipping on us",
          "Dead on arrival or damaged in transit — replaced or refunded, reported within 7 days",
          "Change of mind on a stock item — 14 days, unopened, return shipping at your cost",
        ],
      },
      {
        heading: "What cannot be returned",
        body: ["Some items are not returnable once supplied."],
        list: [
          "Special-order parts brought in specifically for you",
          "Cut-to-length cable, and items supplied to a custom specification",
          "Static-sensitive components whose sealed packaging has been opened",
          "Anything showing signs of installation, wiring or physical modification",
        ],
      },
      {
        heading: "How to start a return",
        body: [
          "Email admin@elffie.com with your order number and a photograph of the item and its label. We reply with a return reference; goods sent back without one can take considerably longer to process.",
          "Refunds go back to the M-Pesa number or card used for the original payment, usually within 5 working days of the goods reaching us.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy",
    summary: "What we collect when you buy from us, and why.",
    updated: UPDATED,
    sections: [
      {
        heading: "What we collect",
        body: ["Only what an order actually requires."],
        list: [
          "Your name, email address and phone number",
          "The delivery address, landmark and any instructions you give",
          "Company name, KRA PIN and PO reference, when you supply them for invoicing",
          "The items, amounts and dates of your orders",
        ],
      },
      {
        heading: "What we do not hold",
        body: [
          "We never see or store card numbers, M-Pesa PINs or bank credentials. Payment is handled entirely by our payment provider; we receive only a confirmation, the channel used, and a reference.",
        ],
      },
      {
        heading: "Who else sees it",
        body: [
          "Our payment provider, to take payment. Our courier, to deliver to you. Our email provider, to send order confirmations. Our hosting and database providers, to run the site. Nobody else — we do not sell or rent customer data, and we do not run advertising trackers.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Order records are kept for seven years, which is what tax and warranty obligations require. Quote requests that do not become orders are deleted after two years. Visit and search records are deleted after six months.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "Email admin@elffie.com to see what we hold about you, correct it, or ask us to delete it. We will delete anything we are not legally required to keep.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use cookies to keep you signed in, remember your cart and remember your currency. There are no advertising or analytics cookies, which is why you are not being asked to consent to any.",
        ],
      },
      {
        heading: "How we measure the site",
        body: [
          "We count visits and record what people search for, so we know which parts to stock. This is done without cookies and without any third-party analytics service — nothing about you is shared with anyone.",
          "To count visitors without identifying them, we combine your IP address and browser with a secret that changes every day, and store only the resulting one-way code. It cannot be turned back into your IP address, and because the secret rotates daily the same person is a different code tomorrow — so it cannot build a picture of you over time. We keep these records for six months.",
          "We also store search terms and how many results they returned. A search that finds nothing tells us what to stock. Where you arrived from is recorded as the site name only, never the full address.",
        ],
      },
    ],
  },
} satisfies Record<string, LegalPage>;

export type LegalSlug = keyof typeof PAGES;

// `satisfies` above keeps the slug keys exact; the annotation here widens each
// page back to LegalPage, so a section without a `list` does not narrow the
// shared type out from under the renderer.
export const LEGAL_PAGES: Record<string, LegalPage> = PAGES;
