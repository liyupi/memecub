#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { extname } from "node:path";
import { parseArgs } from "node:util";
import { ApiError, MemecubClient, type Meme } from "./client.js";
import { clearConfig, configPath, loadConfig, saveConfig } from "./config.js";

const HELP = `memecub — memes and 表情包 for your writing

Usage
  memecub login [--no-browser] [--print]   sign in through the browser; the key is saved for later commands
  memecub whoami                           plan and credits left
  memecub logout                           revoke this machine's key and forget it
  memecub search <query> [--limit 10] [--kind meme|gif|emoji|artwork|photo|upload] [--min-size 150]
                         [--commercial] [--no-credit] [--private] [--profanity] [--json]
  memecub get <id> [--json]
  memecub match <file|-> [--count 4] [--commercial] [--no-credit] [--profanity] [--json]   print the article with memes inserted
  memecub generate [caption] [--action "what happens in the picture"] [--style panda|photo|3d|anime|sticker]
                   [--ref <meme id | image file>] [--locale en|zh] [--out file.jpg] [--json]   draw a new meme with AI
  memecub categories [--json]

  --commercial   only images cleared for commercial use (web-collected memes are not)
  --no-credit    only commercially usable images that need no credit line
  --profanity    also return memes whose captions contain swearing (hidden by default)
  --min-size     skip images smaller than this many pixels on either side

Credits
  search costs 1 credit, match costs 20 per image placed, generate costs 500 per image (refunded if it fails);
  a free account gets 1,000 credits a month. Generated images go to your private library.
  Without signing in you get 20 searches a day. Plans and packs: https://memecub.com/pricing

Environment
  MEMECUB_API_KEY   API key (overrides the one saved by \`memecub login\`); keys: https://memecub.com/dashboard?tab=keys
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
    action: { type: "string" },
    style: { type: "string" },
    ref: { type: "string" },
    locale: { type: "string" },
    out: { type: "string" },
    "no-credit": { type: "boolean", default: false },
    commercial: { type: "boolean", default: false },
    private: { type: "boolean", default: false },
    profanity: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    "no-browser": { type: "boolean", default: false },
    print: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const [cmd, ...rest] = positionals;
const stored = await loadConfig();
const apiUrl = process.env.MEMECUB_API_URL || stored.apiUrl || "https://memecub.com";
const client = new MemecubClient(apiUrl, process.env.MEMECUB_API_KEY || stored.apiKey);

function openBrowser(url: string): void {
  const [bin, args] =
    process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  try {
    spawn(bin, args as string[], { stdio: "ignore", detached: true }).on("error", () => undefined).unref();
  } catch {
    // The URL is printed too, so a missing opener is fine.
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function login() {
  if (stored.apiKey && !values.force) {
    const who = await new MemecubClient(apiUrl, stored.apiKey).account().catch(() => undefined);
    if (who) {
      if (values.print) return void console.log(stored.apiKey);
      console.log(`Already signed in as ${who.data.email}. Run \`memecub logout\` first, or pass --force.`);
      return;
    }
  }
  const anon = new MemecubClient(apiUrl, undefined);
  const start = await anon.startLogin(hostname());
  console.error(`\nOpen this page and confirm the code ${start.user_code}:\n  ${start.verification_uri_complete}\n`);
  if (!values["no-browser"]) openBrowser(start.verification_uri_complete);
  console.error("Waiting for you to approve in the browser…");
  let interval = Math.max(start.interval, 1) * 1000;
  const deadline = Date.now() + start.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval);
    const r = await anon.pollLogin(start.device_code);
    if (r.api_key) {
      await saveConfig({ apiKey: r.api_key, email: r.email, ...(apiUrl !== "https://memecub.com" ? { apiUrl } : {}) });
      const who = await new MemecubClient(apiUrl, r.api_key).account().catch(() => undefined);
      console.error(`Signed in as ${r.email}.${who ? ` ${who.data.credits.remaining.toLocaleString("en-US")} credits left (${who.data.plan}).` : ""}`);
      console.error(`Key saved to ${configPath()}`);
      if (values.print) console.log(r.api_key);
      return;
    }
    if (r.error === "slow_down") interval += 2000;
    else if (r.error === "access_denied") throw new Error("login was denied in the browser");
    else if (r.error === "expired_token" || r.error === "invalid_grant") break;
    else if (r.error !== "authorization_pending") throw new Error(`login failed (${r.error ?? "unknown error"})`);
  }
  throw new Error("login timed out; run `memecub login` again");
}

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

const IMAGE_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

/** `--ref` takes a local image (sent inline, up to 5 MB) or a memecub meme id. */
async function referenceArg(ref: string): Promise<{ ref?: string; ref_image?: string }> {
  const info = await stat(ref).catch(() => undefined);
  if (!info?.isFile()) return { ref };
  const type = IMAGE_TYPES[extname(ref).toLowerCase()];
  if (!type) throw new Error("--ref image must be PNG, JPEG, WebP or GIF");
  if (info.size > 5 * 1024 * 1024) throw new Error("--ref image must be 5 MB or smaller");
  return { ref_image: `data:${type};base64,${(await readFile(ref)).toString("base64")}` };
}

async function main() {
  if (values.help || !cmd) return void process.stdout.write(HELP);

  switch (cmd) {
    case "login":
      return login();
    case "logout": {
      if (stored.apiKey) await new MemecubClient(apiUrl, stored.apiKey).revokeCurrentKey().catch(() => undefined);
      await clearConfig();
      console.log(stored.apiKey ? "Signed out; this machine's key was revoked." : "Not signed in.");
      if (process.env.MEMECUB_API_KEY) console.log("Note: MEMECUB_API_KEY is still set in your environment.");
      return;
    }
    case "whoami":
    case "status": {
      if (!client.apiKey) return void console.log("Not signed in. Run `memecub login` (20 keyless searches a day until then).");
      const { data: a } = await client.account();
      if (values.json) return void console.log(JSON.stringify(a, null, 2));
      const c = a.credits;
      console.log(`${a.email} · ${a.plan}${a.subscription?.cancel_at_period_end ? " (cancels at period end)" : ""}`);
      console.log(`credits: ${c.remaining.toLocaleString("en-US")} left (${c.monthly_remaining.toLocaleString("en-US")} of ${c.monthly_allowance.toLocaleString("en-US")} monthly, resets ${c.resets_at.slice(0, 10)}; ${c.purchased.toLocaleString("en-US")} purchased)`);
      console.log(`rate limit: ${a.rate_limit_per_minute}/min · search ${a.costs.search} credit · match ${a.costs.match} credits per ${a.costs.match_unit ?? "image"}`);
      return;
    }
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
    case "generate": {
      const caption = rest.join(" ").trim();
      if (!caption && !values.action) throw new Error("generate needs a caption or --action");
      if (!client.apiKey) throw new Error("generate needs an account: run `memecub login` first");
      const ref = values.ref ? await referenceArg(values.ref) : {};
      const locale = values.locale === "en" || values.locale === "zh" ? values.locale : undefined;
      console.error("Drawing… (usually 10–30 seconds)");
      const r = await client.generate({ caption: caption || undefined, action: values.action, style: values.style, locale, ...ref });
      if (values.out) {
        const img = await fetch(r.data.meme.url);
        if (!img.ok) throw new Error(`could not download the image (HTTP ${img.status})`);
        await writeFile(values.out, Buffer.from(await img.arrayBuffer()));
      }
      if (values.json) return void console.log(JSON.stringify(r.data, null, 2));
      console.log(`${r.data.meme.id}  ${r.data.meme.title}  (${r.data.style}, saved to your private library)\n  ${r.data.meme.url}`);
      if (values.out) console.log(`  saved to ${values.out}`);
      if (client.creditsRemaining !== undefined) console.error(`${client.creditsRemaining.toLocaleString("en-US")} credits left.`);
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
  if (err instanceof ApiError && err.status === 429 && !client.apiKey) console.error("Sign in for more: memecub login");
  process.exitCode = 1;
});
