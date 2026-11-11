# memecub

Find memes, 表情包 and reaction images and place them into your writing. Classic memes collected from the web are marked `commercial_use: false`; openly licensed emoji, art and photos are marked `commercial_use: true` with their license and a ready credit line. Every result has a Markdown snippet.

```bash
npx memecub search "facepalm" --limit 5
npm i -g memecub                              # or install the `memecub` command, Node 18+
memecub search "facepalm" --limit 5
memecub search "无语" --kind meme --json
memecub search "mind blown" --commercial      # only images cleared for commercial use
memecub match ./article.md --count 4 > article.with-memes.md
memecub generate "Works on my machine" --action "a cat shrugging at a burning server" --out meme.jpg
memecub generate "收到" --ref ./mascot.png --style 3d   # reuse a character from a local image or a meme id
```

Memes whose captions contain swearing are hidden unless you pass `--profanity`. `generate` draws a new meme with AI (needs an account) and saves it to your private library (the file's metadata marks it as AI-generated); styles are `panda`, `photo`, `3d`, `anime` and `sticker`.

Run `npx memecub login` to sign in through the browser (the key is saved to `~/.config/memecub/config.json`), or set `MEMECUB_API_KEY` (create one at https://memecub.com/dashboard?tab=keys). Without signing in you get 20 searches a day; a free account gets 1,000 credits a month (search 1, match 20 per image placed, generate 500 per image). `memecub whoami` shows what is left; plans at https://memecub.com/pricing.

## As a library

```ts
import { MemecubClient } from "memecub";

const client = new MemecubClient("https://memecub.com", process.env.MEMECUB_API_KEY);
const { data } = await client.search({ q: "mind blown", limit: 5, commercialOnly: true });
const matched = await client.match(articleMarkdown, { count: 4 });
const made = await client.generate({ caption: "Ship it", action: "a dog in sunglasses pressing a big red button" });
```

## For AI agents

- Remote MCP server: `https://memecub.com/mcp`
- Agent skill: `https://memecub.com/skill.md`
