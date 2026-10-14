# memecub

Find memes, 表情包 and reaction images and place them into your writing. Classic memes collected from the web are marked `commercial_use: false`; openly licensed emoji, art and photos are marked `commercial_use: true` with their license and a ready credit line. Every result has a Markdown snippet.

```bash
npx memecub search "facepalm" --limit 5
npm i -g memecub                              # or install the `memecub` command, Node 18+
memecub search "facepalm" --limit 5
memecub search "无语" --kind meme --json
memecub search "mind blown" --commercial      # only images cleared for commercial use
memecub match ./article.md --count 4 > article.with-memes.md
```

Memes whose captions contain swearing are hidden unless you pass `--profanity`.

Set `MEMECUB_API_KEY` (create one at https://memecub.com/library#keys) to search your private library and get higher daily limits.

## As a library

```ts
import { MemecubClient } from "memecub";

const client = new MemecubClient("https://memecub.com", process.env.MEMECUB_API_KEY);
const { data } = await client.search({ q: "mind blown", limit: 5, commercialOnly: true });
const matched = await client.match(articleMarkdown, { count: 4 });
```

## For AI agents

- Remote MCP server: `https://memecub.com/mcp`
- Agent skill: `https://memecub.com/skill.md`
