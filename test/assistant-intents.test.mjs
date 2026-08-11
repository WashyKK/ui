// The intent matcher compiled straight from the TS source, so the test runs
// against the real thing rather than a copy that can drift.
import { execSync } from "node:child_process";
import fs from "node:fs";
execSync("npx esbuild src/lib/assistant-intents.ts --format=esm --outfile=/tmp/elffie-intents.mjs", { cwd: "/home/wkk/ui", stdio: "pipe" });
const { answerLocally, answerCartLocally, extractCartAction, stripPartialSentinel } = await import("/tmp/elffie-intents.mjs");

const P = { id: "x", name: "Arduino UNO", stock: 20, priceUsd: 8 };
// Stands in for the page's currency formatter (USD -> KSh at 130).
const money = (usd) => `KSh ${Math.round(usd * 130).toLocaleString()}`;
let pass = 0, fail = 0;
const t = (label, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  if (!ok) console.log(`  FAIL  ${label}\n        got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

console.log("— should be FREE (handled locally, no model) —");
for (const [q, kind] of [
  ["how many are left?", "reply"],
  ["how many do you have in stock", "reply"],
  ["is it available?", "reply"],
  ["how much is it", "reply"],
  ["what's the price?", "reply"],
  ["what does it cost", "reply"],
  ["add 2 to my cart", "add"],
  ["add to cart", "add"],
  ["put three in my basket", "add"],
  ["I'll take two", "add"],
  ["i want to buy it", "add"],
  ["get me 5", "add"],
]) {
  const r = answerLocally(q, P, money);
  t(`"${q}"`, r?.kind ?? null, kind);
}

console.log("\n— should FALL THROUGH to the model (judgement, not lookup) —");
for (const q of [
  "is it right for my project?",
  "will it work with a 24V supply?",
  "should I buy this or the ESP32?",
  "what do I need to run it?",
  "is this compatible with a NEMA 17?",
  "how much current can it supply?",   // a spec question, must not be a price answer
  "what's the difference between this and the Mega?",
  "can it drive a stepper directly?",
]) {
  t(`"${q}"`, answerLocally(q, P, money), null);
}

console.log("\n— quantities —");
t("add 3", answerLocally("add 3 to cart", P, money)?.quantity, 3);
t("a couple", answerLocally("add a couple to my cart", P, money)?.quantity, 2);
t("clamped to stock", answerLocally("add 500 to my cart", { ...P, stock: 3 }, money)?.quantity, 3);
t("out of stock refuses", answerLocally("add to cart", { ...P, stock: 0 }, money)?.kind, "reply");

console.log("\n— cart —");
const LINES = [{ name: "Arduino UNO", quantity: 2, lineUsd: 16 }];
t("what's in my cart", answerCartLocally("what's in my cart?", LINES, 16, money)?.kind, "reply");
t("total", answerCartLocally("what's the total?", LINES, 16, money)?.kind, "reply");
t("empty cart", answerCartLocally("what's in my cart?", [], 0, money)?.text, "Your cart is empty at the moment.");
t("judgement falls through", answerCartLocally("am I missing anything?", LINES, 16, money), null);

console.log("\n— sentinel —");
t("extract", extractCartAction("Sure, adding those. [[cart:add:2]]")?.quantity, 2);
t("stripped from display", extractCartAction("Sure, adding those. [[cart:add:2]]")?.clean, "Sure, adding those.");
t("absent", extractCartAction("Just an answer."), null);
t("partial hidden", stripPartialSentinel("Adding now. [[cart:ad"), "Adding now.");
t("complete hidden mid-stream", stripPartialSentinel("Adding now. [[cart:add:2]]"), "Adding now.");
t("malformed sentinel never leaks", stripPartialSentinel("Confirming. [[cart:add:N]]"), "Confirming.");
t("malformed leaves no action", extractCartAction("Confirming. [[cart:add:N]]"), null);


console.log("\n— must NOT be answered locally: measurements and specs —");
for (const q of [
  "how much current does it supply?",
  "how much power does it draw?",
  "how much does it weigh?",
  "how much torque does it produce?",
  "how much cable comes with it?",
  "is the datasheet available?",
  "is a 24V version available?",
  "is mounting hardware available separately?",
  "what is the cost of shipping to Mombasa?",
  "how many wires does it have?",
  "how many pins does it have?",
  "what is the operating temperature range?",
]) {
  t(`"${q}"`, answerLocally(q, P, money), null);
}

console.log("\n— but the genuine lookups must still be free —");
for (const [q, kind] of [
  ["how much is it?", "reply"],
  ["how much does it cost?", "reply"],
  ["what is the price?", "reply"],
  ["is it in stock?", "reply"],
  ["how many are left?", "reply"],
  ["do you have any?", "reply"],
  ["are they available?", "reply"],
]) t(`"${q}"`, answerLocally(q, P, money)?.kind ?? null, kind);

console.log("\n— cart: measurements and judgement go to the model —");
for (const q of [
  "what is the total current draw of these?",
  "total weight of this order?",
  "is my order complete?",
  "have I got everything I need?",
]) t(`cart "${q}"`, answerCartLocally(q, LINES, 16, money), null);
t('cart "what is my total?"', answerCartLocally("what is my total?", LINES, 16, money)?.kind, "reply");
t('cart "what\'s in my cart?"', answerCartLocally("what's in my cart?", LINES, 16, money)?.kind, "reply");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
