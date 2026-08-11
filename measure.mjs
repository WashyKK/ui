// Exact prompt cost, straight from the API's own usage accounting.
// max_tokens:1 so the completion is free; we only want prompt_tokens.
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("/home/wkk/ui/.env","utf8").split("\n").filter(l=>l.includes("=")&&!l.trimStart().startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));

export async function cost(messages) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 1 }),
  });
  const d = await r.json();
  if (!d.usage) throw new Error(JSON.stringify(d).slice(0, 300));
  return d.usage.prompt_tokens;
}
