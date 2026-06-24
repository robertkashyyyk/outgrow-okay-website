#!/usr/bin/env node
// Populate (upsert) a client proposal from a local file — the "author in Claude Chat,
// hand the file to Code, Code puts it on the Portal" workflow. No external API spend:
// it just resolves the client by name and writes one row via the service-role key.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/populate-proposal.mjs \
//     --client "The Academy of Excellence" \
//     --title  "Cairnfields — Phase 0" \
//     --slug   cairnfields-phase-0 \
//     --format html \
//     --status published \
//     --file   content/proposals/cairnfields-walkthrough.html
//
// Re-running with the same --slug updates the existing proposal (idempotent).
// Env can also come from a .env.local in the repo root (VITE_SUPABASE_URL is accepted
// as a fallback for the URL). The service-role key is never committed — pass it inline.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const url =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !serviceKey) {
  console.error(
    "Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.",
  );
  process.exit(1);
}

const clientName = arg("client");
const title = arg("title");
const slug = arg("slug");
const format = arg("format", "markdown");
const status = arg("status", "draft");
const file = arg("file");

if (!clientName || !title || !slug || !file) {
  console.error("Required: --client, --title, --slug, --file (optional: --format, --status)");
  process.exit(1);
}
if (!["markdown", "html"].includes(format)) {
  console.error(`--format must be markdown|html (got ${format})`);
  process.exit(1);
}
if (!["draft", "published", "archived"].includes(status)) {
  console.error(`--status must be draft|published|archived (got ${status})`);
  process.exit(1);
}

const body = readFileSync(file, "utf8");
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Resolve the client by exact company name.
const { data: clients, error: cErr } = await supabase
  .from("clients")
  .select("id, company_name")
  .eq("company_name", clientName);
if (cErr) {
  console.error("Client lookup failed:", cErr.message);
  process.exit(1);
}
if (!clients || clients.length === 0) {
  console.error(`No client named "${clientName}". Create it first (Studio → Clients).`);
  process.exit(1);
}
if (clients.length > 1) {
  console.error(`Multiple clients named "${clientName}" — disambiguate by renaming one.`);
  process.exit(1);
}
const clientId = clients[0].id;

// Upsert by slug (slug is globally unique).
const { data: existing } = await supabase
  .from("proposals")
  .select("id")
  .eq("slug", slug)
  .maybeSingle();

const row = { client_id: clientId, title, slug, format, body, status };

let result;
if (existing) {
  result = await supabase
    .from("proposals")
    .update(row)
    .eq("id", existing.id)
    .select("id, slug, status")
    .single();
} else {
  result = await supabase
    .from("proposals")
    .insert(row)
    .select("id, slug, status")
    .single();
}

if (result.error) {
  console.error("Write failed:", result.error.message);
  process.exit(1);
}

console.log(
  `${existing ? "Updated" : "Created"} proposal "${title}" (${result.data.status}) for ${clientName}.`,
);
console.log(`Portal URL: /portal/proposals/${result.data.slug}`);
