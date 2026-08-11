/**
 * Answer the cheap questions without a model.
 *
 * The single biggest token saving available here is not a shorter prompt — it
 * is not making the call. "How many are left?", "how much is it?", "add two to
 * my cart", "what's in my cart" are the most common things anyone types into a
 * box like this, and every one of them is answerable from data the page already
 * holds. Sending them to a model costs ~430 tokens to look up a number that is
 * rendered two inches further up the same screen.
 *
 * So this runs first, in the browser, before any request is made. Anything it
 * recognises is answered instantly and for nothing. Everything else — the open
 * questions a model is actually good at — falls through.
 *
 * The matching is deliberately conservative. A false positive here answers the
 * wrong question confidently, which is worse than spending the tokens; when a
 * phrasing is at all ambiguous it is left to fall through.
 */

export interface LocalProduct {
  id: string;
  name: string;
  stock: number;
  /** USD, as everywhere else in the codebase. */
  priceUsd: number;
  onSale?: boolean;
  percentOff?: number;
}

export interface LocalCartLine {
  name: string;
  quantity: number;
  /** USD. */
  lineUsd: number;
}

/**
 * The page's own money formatter, threaded in rather than reimplemented.
 *
 * Prices are held in USD and displayed through the currency switcher, so the
 * assistant has to render them the same way the rest of the page does. Writing
 * `KSh ${price}` here quoted the raw dollar figure with a shilling sign on it —
 * an $8 board reading "KSh 8" instead of "KSh 1,040". The assistant must never
 * be a second source of truth for a price.
 */
export type MoneyFormatter = (usd: number) => string;

export type LocalAnswer =
  | { kind: "reply"; text: string }
  | { kind: "add"; quantity: number; text: string }
  | null;

/**
 * A physical quantity, a spec, or a cost that is not this item's price.
 *
 * This guard exists because the loose version of these patterns was actively
 * wrong, not merely imprecise. "How much power does it draw?" matched the price
 * rule and answered KSh 1,040. "Is the datasheet available?" matched the stock
 * rule and answered "20 in stock". "What is the total current draw of these?"
 * answered with a money total. Each of those is a confident answer to a question
 * nobody asked, and — on a store selling parts people wire into things — the
 * spec ones are the same class of mistake the model is forbidden from making.
 *
 * So anything that smells like a measurement, a specification, or shipping is
 * sent to the model. Paying 400 tokens is strictly better than answering the
 * wrong question for free.
 */
const NOT_A_LOOKUP =
  /\b(current|voltage|volts?|amp(?:s|ere)?|watt|power|draw|consumption|weigh|weight|torque|rpm|speed|length|width|height|depth|dimension|size|resistance|capacit|inductance|frequency|temperature|thermal|range|cable|wire|pin|pinout|memory|flash|ram|baud|distance|accuracy|tolerance|load|pressure|flow|duty|rating|spec|datasheet|manual|firmware|driver|library|version|variant|model|colour|color|shipping|delivery|postage|freight|warranty|return)\b/i;

/** Words that mean "put it in the basket", as actually typed. */
const ADD = /\b(add|put|chuck|throw|stick)\b.*\b(cart|basket|trolley|order)\b|\b(i(?:'| w)?ll take|i want to buy|buy it|order it|get me)\b/i;

/**
 * Deliberately narrow. Each of these has to be unmistakably about this item's
 * availability or price — not about whether some accessory exists, not about
 * shipping cost.
 */
const STOCK =
  /\b(in stock|out of stock|how many (?:are |do you |have you |you )?(?:left|available|got|in stock|remaining)|how many (?:have|do) you (?:have|got)|do you have (?:any|it|these|them|some)|still (?:have|available)|(?:is|are) (?:it|this|these|they) available)\b/i;

const PRICE =
  /\b(how much (?:is|are|for)\b|how much (?:does|do) (?:it|this|these|they) cost|what(?:'s| is| are)?(?: the)? price|what does (?:it|this) cost|unit price|price per)\b|^price\b|\bprice\?$/i;

/** Listing the cart, not judging it. "Is my order complete?" is not this. */
const CART_SUMMARY =
  /\b(what(?:'s| is| are)?\s+(?:in|on)\s+(?:my\s+)?(?:cart|basket|order)|show (?:me )?(?:my )?(?:cart|basket|order)|what (?:did|have) i (?:order|add|buy)|(?:cart|order) summary|list (?:my )?(?:cart|order))\b/i;

const TOTAL =
  /\b(what(?:'s| is)?(?: my| the)? total|grand total|how much (?:is|do i owe|altogether|in total)|total (?:cost|price|amount)|come to)\b/i;

/**
 * A leading quantity: "add 3", "two of these", "I'll take a couple".
 * Returns 1 when the intent is clear but no number was given.
 */
/**
 * Ordered, not a plain map: "add a couple to my cart" contains the article "a",
 * and if that is tested first it wins and the customer gets one instead of two.
 * Specific quantity words are checked before the articles that can precede them.
 */
const WORD_NUMBERS: [string, number][] = [
  ["dozen", 12], ["couple", 2], ["pair", 2],
  ["two", 2], ["three", 3], ["four", 4], ["five", 5], ["six", 6],
  ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
  ["one", 1], ["an", 1], ["a", 1],
];

function quantityIn(text: string): number {
  const digits = text.match(/\b(\d{1,3})\b/);
  if (digits) return Math.max(1, parseInt(digits[1], 10));
  for (const [word, n] of WORD_NUMBERS) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return n;
  }
  return 1;
}

/**
 * Try to answer a product-page question locally.
 * Returns null when the question needs the model.
 */
export function answerLocally(
  question: string,
  product: LocalProduct,
  money: MoneyFormatter
): LocalAnswer {
  const q = question.trim();
  if (!q) return null;

  // Suitability is a judgement call, not a lookup.
  const isJudgement = /\b(should|suitable|right for|will it|can it|compatible|instead of|better|recommend|difference|enough)\b/i.test(q);
  if (isJudgement) return null;

  // "add 2 to my cart" is unambiguous even when it mentions a spec, so the
  // measurement guard applies to the lookups below it, not to this.
  if (ADD.test(q)) {
    const wanted = quantityIn(q);
    if (product.stock <= 0) {
      return { kind: "reply", text: `${product.name} is out of stock at the moment, so I can't add it. You can ask to be notified when it's back.` };
    }
    const qty = Math.min(wanted, product.stock);
    const capped = qty < wanted
      ? ` That's all we have — you asked for ${wanted}.`
      : "";
    return {
      kind: "add",
      quantity: qty,
      text: `Added ${qty} × ${product.name} to your cart — ${money(product.priceUsd * qty)}.${capped}`,
    };
  }

  // Past this point every answer is a lookup, and a lookup must not be given
  // to a question about a measurement.
  if (NOT_A_LOOKUP.test(q)) return null;

  if (STOCK.test(q)) {
    return {
      kind: "reply",
      text: product.stock > 0
        ? `${product.stock} in stock, ready to ship from Nairobi.`
        : `Out of stock right now. You can ask to be notified when it returns.`,
    };
  }

  if (PRICE.test(q)) {
    const sale = product.onSale && product.percentOff
      ? ` — on sale, ${product.percentOff}% off`
      : "";
    return { kind: "reply", text: `${money(product.priceUsd)}${sale}.` };
  }

  return null;
}

/**
 * Try to answer a cart question locally.
 *
 * Almost every cart question is arithmetic over data already in the browser.
 * Asking a language model to add up numbers it was just handed is the most
 * expensive possible way to get a total, and the least reliable.
 */
export function answerCartLocally(
  question: string,
  lines: LocalCartLine[],
  totalUsd: number,
  money: MoneyFormatter
): LocalAnswer {
  const q = question.trim();
  if (!q) return null;
  if (/\b(should|suitable|compatible|will (?:this|these)|do i need|missing|instead|recommend|enough|complete|everything|right)\b/i.test(q)) return null;
  if (NOT_A_LOOKUP.test(q)) return null;

  if (!lines.length && (CART_SUMMARY.test(q) || TOTAL.test(q))) {
    return { kind: "reply", text: "Your cart is empty at the moment." };
  }

  if (CART_SUMMARY.test(q)) {
    const body = lines.map((l) => `• ${l.quantity} × ${l.name} — ${money(l.lineUsd)}`).join("\n");
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    return {
      kind: "reply",
      text: `${count} item${count === 1 ? "" : "s"} in your cart:\n${body}\n\nTotal ${money(totalUsd)}, before delivery.`,
    };
  }

  if (TOTAL.test(q)) {
    return { kind: "reply", text: `${money(totalUsd)} for everything in the cart, before delivery.` };
  }

  return null;
}

/**
 * The model's way of asking for a cart change.
 *
 * A sentinel rather than a function-calling tool, and the difference is not
 * small: measured against this store's own prompt, three tool schemas cost 114
 * extra tokens on the way out and force a second round trip that resends the
 * entire prompt — 1119 tokens for one "add two to my cart" against 432 for
 * this. The sentinel does the same job for 5% over a plain answer.
 *
 * Parsed only from the model's own output stream, and the quantity is clamped
 * against real stock by the caller, so the worst a confused or manipulated
 * model can do is add an item the customer can see and remove.
 */
const SENTINEL = /\[\[cart:add:(\d{1,3})\]\]/i;

export function extractCartAction(text: string): { quantity: number; clean: string } | null {
  const m = text.match(SENTINEL);
  if (!m) return null;
  return {
    quantity: Math.max(1, parseInt(m[1], 10)),
    clean: stripPartialSentinel(text).trim(),
  };
}

/**
 * Strip sentinel markup from anything shown to a customer.
 *
 * Deliberately broader than the parser. The parser only accepts a well-formed
 * [[cart:add:2]]; this removes any [[...]] block and any trailing fragment of
 * one mid-stream. The two must not share a pattern, because the failure that
 * matters is the one where the model writes something the parser rejects —
 * it emitted a literal [[cart:add:N]] on the first real attempt — and the
 * customer sees internal markup in their answer.
 */
export function stripPartialSentinel(text: string): string {
  return text
    .replace(/\[\[[^\]]{0,40}\]\]/g, "")   // any complete [[...]] block
    .replace(/\[\[[^\]]{0,40}$/, "")        // an unclosed one still arriving
    .replace(/[ \t]+$/, "");
}
