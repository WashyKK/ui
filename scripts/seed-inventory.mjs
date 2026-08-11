#!/usr/bin/env node
/**
 * Seed or update the catalogue from a JSON file.
 *
 *   node scripts/seed-inventory.mjs seed/inventory.json
 *   node scripts/seed-inventory.mjs seed/inventory.json --dry-run
 *
 * Re-runnable. Products are matched on MPN first, then SKU, then exact name, so
 * running it twice updates rather than duplicating — which matters because the
 * usual reason to run it again is that a price or a stock figure was wrong.
 *
 * Categories are given as a path ("Motors > DC Motors > Stepper Motors") and the missing
 * nodes are created, so the tree comes out of the data rather than needing to
 * be built by hand first.
 *
 * Expected shape per item — only `name` and `price` are required:
 *
 *   {
 *     "name": "NEMA 17 Stepper Motor",
 *     "mpn": "17HS4401",
 *     "manufacturer": "Usongshine",
 *     "sku": "MOT-NEMA17-01",
 *     "price": 12.50,              // USD, as products.price is USD
 *     "priceKes": 1600,            // or give KES and it converts
 *     "stock": 25,
 *     "category": "Motors > DC Motors > Stepper Motors",
 *     "description": "Markdown is fine here.",
 *     "imageUrl": "https://…",
 *     "datasheetUrl": "https://…",
 *     "status": "active",
 *     "salePrice": 10.00,
 *     "attributes": { "supply_voltage": "12", "current_rating": "1.7" },
 *     "links":    [{ "title": "Datasheet hub", "url": "https://…" }],
 *     "snippets": [{ "title": "Basic step", "language": "arduino", "code": "…" }]
 *   }
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!file) {
  console.error("usage: node scripts/seed-inventory.mjs <items.json> [--dry-run]");
  process.exit(1);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE);
const USD_TO_KES = Number(env.USD_TO_KES_RATE || env.NEXT_PUBLIC_USD_TO_KES_RATE || 130);

const items = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
if (!Array.isArray(items)) {
  console.error("The file must contain a JSON array of items.");
  process.exit(1);
}

/**
 * Resolve "Motors > DC Motors > Stepper Motors" to a category id, creating only what is
 * genuinely missing.
 *
 * The lookup is deliberately loose, because a path written out by hand rarely
 * matches the tree exactly — the live tree has Microcontrollers sitting under
 * "Microcontrollers & Microcomputers", and nobody writing an inventory list is
 * going to type that. So a segment is matched first as a child of where we are,
 * then by name anywhere in the tree, and only created if the name does not
 * exist at all. Getting this wrong does not fail loudly; it quietly grows a
 * second "Motors" beside the first and splits the catalogue in half.
 */
const categoryCache = new Map();
let allCategories = null;

async function loadCategories() {
  if (allCategories) return allCategories;
  const { data, error } = await db.from("categories").select("id, name, parent_id");
  if (error) throw new Error(`reading categories: ${error.message}`);
  allCategories = data ?? [];
  return allCategories;
}

async function resolveCategory(pathString) {
  if (!pathString) return null;
  const parts = String(pathString).split(/[>›\/]/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;

  const rows = await loadCategories();
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();

  let parentId = null;
  let key = "";
  for (const name of parts) {
    key = key ? `${key} > ${name}` : name;
    if (categoryCache.has(key)) { parentId = categoryCache.get(key); continue; }

    // A child of where we are, which is what the path literally asked for.
    let found = rows.find((c) => same(c.name, name) && c.parent_id === parentId);

    // Otherwise the same name anywhere — but only if it is unambiguous. Two
    // categories called "Sensors" in different branches is a question for a
    // person, not something to guess at.
    if (!found) {
      const byName = rows.filter((c) => same(c.name, name));
      if (byName.length === 1) {
        found = byName[0];
        console.log(`      "${name}" matched an existing category elsewhere in the tree`);
      } else if (byName.length > 1) {
        throw new Error(`category "${name}" is ambiguous — ${byName.length} of them exist, give a fuller path`);
      }
    }

    if (found) {
      parentId = found.id;
    } else if (dryRun) {
      console.log(`      would create category "${key}"`);
      parentId = `dry-${key}`;
    } else {
      const insert = { name };
      if (parentId) insert.parent_id = parentId;
      const { data: made, error } = await db.from("categories").insert(insert).select("id").single();
      if (error) throw new Error(`category "${key}": ${error.message}`);
      console.log(`      created category "${key}"`);
      rows.push({ id: made.id, name, parent_id: parentId });
      parentId = made.id;
    }
    categoryCache.set(key, parentId);
  }
  return parentId;
}

/** Match an existing row so a re-run updates instead of duplicating. */
async function findExisting(item) {
  for (const [column, value] of [["mpn", item.mpn], ["sku", item.sku]]) {
    if (!value) continue;
    const { data } = await db.from("products").select("id, name").ilike(column, value).maybeSingle();
    if (data) return data;
  }
  const { data } = await db.from("products").select("id, name").ilike("name", item.name).maybeSingle();
  return data ?? null;
}

async function setAttributes(productId, attributes) {
  if (!attributes || typeof attributes !== "object") return;
  const { data: keys } = await db.from("attribute_keys").select("id, key");
  if (!keys?.length) return;
  const byKey = new Map(keys.map((k) => [k.key, k.id]));

  await db.from("product_attributes").delete().eq("product_id", productId);
  const rows = Object.entries(attributes)
    .filter(([k, v]) => byKey.has(k) && String(v).trim())
    .map(([k, v]) => ({ product_id: productId, key_id: byKey.get(k), value: String(v).trim() }));
  if (rows.length) await db.from("product_attributes").insert(rows);
}

async function setCollection(table, productId, rows) {
  if (!Array.isArray(rows)) return;
  await db.from(table).delete().eq("product_id", productId);
  if (!rows.length) return;
  const { error } = await db.from(table).insert(
    rows.map((r, position) => ({ ...r, product_id: productId, position }))
  );
  if (error) console.warn(`      ${table}: ${error.message}`);
}

let created = 0, updated = 0, failed = 0;

for (const [i, item] of items.entries()) {
  const label = `${String(i + 1).padStart(3)}  ${item.name ?? "(unnamed)"}`;
  try {
    if (!item.name) throw new Error("missing name");

    const priceUsd = item.price != null
      ? Number(item.price)
      : item.priceKes != null
        ? Number((Number(item.priceKes) / USD_TO_KES).toFixed(2))
        : null;
    if (priceUsd == null || !Number.isFinite(priceUsd)) throw new Error("missing or invalid price");

    const categoryId = await resolveCategory(item.category);
    const existing = await findExisting(item);

    const row = {
      name: item.name,
      description: item.description ?? null,
      price: priceUsd,
      stock: Number(item.stock ?? 0),
      mpn: item.mpn ?? null,
      sku: item.sku ?? null,
      manufacturer: item.manufacturer ?? null,
      image_url: item.imageUrl ?? null,
      datasheet_url: item.datasheetUrl ?? null,
    };
    if (categoryId && !String(categoryId).startsWith("dry-")) row.category_id = categoryId;
    if (item.status) row.status = item.status;
    if (item.salePrice != null) row.sale_price = Number(item.salePrice);

    if (dryRun) {
      console.log(`${label}  →  would ${existing ? "update" : "create"} at $${priceUsd}, stock ${row.stock}`);
      continue;
    }

    let productId;
    if (existing) {
      const { error } = await db.from("products").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
      productId = existing.id;
      updated++;
      console.log(`${label}  updated`);
    } else {
      const { data, error } = await db.from("products").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      productId = data.id;
      created++;
      console.log(`${label}  created`);
    }

    await setAttributes(productId, item.attributes);
    await setCollection("product_links", productId, item.links);
    await setCollection("product_snippets", productId, item.snippets);
    if (Array.isArray(item.images)) {
      await setCollection("product_images", productId, item.images.map((url) =>
        typeof url === "string" ? { url } : url
      ));
    }
  } catch (err) {
    failed++;
    console.error(`${label}  FAILED — ${err.message}`);
  }
}

console.log(
  dryRun
    ? `\nDry run over ${items.length} item(s). Nothing was written.`
    : `\n${created} created, ${updated} updated, ${failed} failed.`
);
