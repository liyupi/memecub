#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { MemecubClient, type Meme } from "./client.js";

const HELP = `memecub — memes and 表情包 for your writing

Usage
  memecub search <query> [--limit 10] [--kind meme|gif|emoji|artwork|photo|upload] [--min-size 150]
                         [--commercial] [--no-credit] [--private] [--profanity] [--json]
  memecub get <id> [--json]
  memecub match <file|-> [--count 4] [--commercial] [--no-credit] [--profanity] [--json]   print the article with memes inserted
  memecub categories [--json]

  --commercial   only images cleared for commercial use (web-collected memes are not)
  --no-credit    only commercially usable images that need no credit line
  --profanity    also return memes whose captions contain swearing (hidden by default)
  --min-size     skip images smaller than this many pixels on either side

Environment
  MEMECUB_API_KEY   API key from https://memecub.com/library#keys (private library, higher limits)
  MEMECUB_API_URL   defaults to https://memecub.com
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    limit: { type: "string" },
    count: { type: "string" },
    "min-size": { type: "string" },
    kind: { type: "string" },
    category: { type: "string" },
    "no-credit": { type: "boolean", default: false },
    commercial: { type: "boolean", default: false },
    private: { type: "boolean", default: false },
    profanity: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const [cmd, ...rest] = positionals;
const client = new MemecubClient();

function line(m: Meme): string {
  if (m.private) {
    return `${m.id}  ${m.title}  (your upload)
  ${m.url}
  declared license: ${m.license.code}`;
  }
  const credit = !m.license.commercial_use
    ? "not cleared for commercial use"
    : m.license.attribution_required
      ? `credit: ${m.attribution}`
      : "no credit needed";
  const flags = m.review_status !== "approved" ? m.review_status : "";
  const zh = m.title_zh && m.title_zh !== m.title ? ` / ${m.title_zh}` : "";
  return `${m.id}  ${m.title}${zh}${flags ? `  (${flags})` : ""}
  ${m.url}
  ${m.license.name} · ${credit}`;
}

async function readInput(path: string): Promise<string> {
  if (path !== "-") return readFile(path, "utf8");
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  if (values.help || !cmd) return void process.stdout.write(HELP);

  switch (cmd) {
    case "search": {
      const q = rest.join(" ").trim();
      if (!q) throw new Error("search needs a query");
      const r = await client.search({
        q,
        limit: Number(values.limit ?? 10),
        kind: values.kind,
        category: values.category,
        noCredit: values["no-credit"],
        commercialOnly: values.commercial,
        privateOnly: values.private,
        profanity: values.profanity,
        minSize: values["min-size"] ? Number(values["min-size"]) : undefined,
      });
      if (values.json) return void console.log(JSON.stringify(r, null, 2));
      if (r.data.length === 0) console.log(`No results for "${q}".`);
      for (const m of r.data) console.log(`${line(m)}\n`);
      if (r.backfill_queued) console.error("Few results: memecub is fetching more images for this query. Try again in a minute.");
      return;
    }
    case "get": {
      if (!rest[0]) throw new Error("get needs an id");
      const r = await client.get(rest[0]);
      return void console.log(values.json ? JSON.stringify(r.data, null, 2) : line(r.data));
    }
    case "match": {
      if (!rest[0]) throw new Error("match needs a file path or - for stdin");
      const text = await readInput(rest[0]);
      const r = await client.match(text, {
        count: Number(values.count ?? 4),
        noCredit: values["no-credit"],
        commercialOnly: values.commercial,
        profanity: values.profanity,
      });
      if (values.json) return void console.log(JSON.stringify(r.data, null, 2));
      process.stdout.write(r.data.markdown + "\n");
      for (const s of r.data.slots) {
        const pick = !s.meme
          ? "no match"
          : `${s.meme.title}${s.meme.license.commercial_use ? "" : " (not cleared for commercial use)"}${s.placed ? "" : " [not inserted: sentence not found]"}`;
        console.error(`• ${s.emotion}: ${pick} — “${s.anchor.slice(0, 60)}”`);
      }
      return;
    }
    case "categories": {
      const r = await client.categories();
      if (values.json) return void console.log(JSON.stringify(r.data, null, 2));
      for (const c of r.data) console.log(`${c.slug.padEnd(18)} ${String(c.count).padStart(6)}  ${c.name} / ${c.name_zh}`);
      return;
    }
    default:
      process.stdout.write(HELP);
      process.exitCode = 1;
  }
}

main().catch((err: Error) => {
  console.error(`memecub: ${err.message}`);
  process.exitCode = 1;
});
