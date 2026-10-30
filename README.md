<div align="center">

<img src="assets/logo.png" alt="memecub logo" width="88">

# memecub

**Meme search and automatic meme placement for AI agents.**

Give Claude Code, Cursor, Codex or Claude Desktop a meme library. Search reaction memes by feeling, or hand over an article and get it back with the right meme after the right sentence.

English · [简体中文](README.zh-CN.md)

[![Website](https://img.shields.io/badge/memecub.com-ffd43b?style=flat-square&logoColor=1d1c1a)](https://memecub.com)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-com.memecub%2Fmemecub-1d1c1a?style=flat-square)](https://registry.modelcontextprotocol.io/v0/servers?search=com.memecub/memecub)
[![Smithery](https://img.shields.io/badge/Smithery-memecub-1d1c1a?style=flat-square)](https://smithery.ai/servers/memecub/memecub)
[![Remote MCP](https://img.shields.io/badge/remote_MCP-Streamable_HTTP-1d1c1a?style=flat-square)](#quick-start)
[![npm](https://img.shields.io/npm/v/memecub?style=flat-square&color=1d1c1a)](https://www.npmjs.com/package/memecub)
[![License: MIT](https://img.shields.io/badge/code-MIT-1d1c1a?style=flat-square)](LICENSE)

</div>

![Paste an article, get it back with memes: real output of match_article](assets/demo-en.png)

<p align="center"><sub>Real output of <code>match_article</code>. The model picks the moments; memecub finds the meme and inserts it as Markdown.</sub></p>

## Why memecub

- **It places memes, not just finds them.** `match_article` reads a whole post, picks the sentences worth a meme and returns the article with images inserted. Your agent doesn't have to guess where they go.
- **Search by feeling.** Ask for `facepalm`, `this is fine`, `it works on my machine`, `无语` or `摸鱼` and get the reaction you meant, not a keyword lookalike.
- **English memes and Chinese 表情包 in one library.** Drake, This Is Fine, Doge and Surprised Pikachu next to 熊猫头, 奶龙, 金馆长, 吗喽 and DeepSeek 鲸鱼娘. Chinese queries match whole phrases, so a character name returns that character.
- **Zero install.** A remote MCP server over Streamable HTTP, or a plain-curl Agent Skill. Searching works without a key.
- **License-aware results.** Every image says whether it is cleared for commercial use, links its source, and ships a ready Markdown snippet with the credit line when one is required. Ask for commercial-safe only and that's all you get.
- **Safe defaults for agents.** Memes whose captions contain swearing are left out of agent results unless you ask for them.

## Quick start

**One command, 40+ agents.** Installs the memecub skill into Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenClaw, Trae, Windsurf and any other agent that loads [Agent Skills](#agent-skill):

```bash
npx skills add https://memecub.com
```

Prefer MCP? The server is `https://memecub.com/mcp` (Streamable HTTP). Pick your client:

**Claude Code**

```bash
claude mcp add --transport http memecub https://memecub.com/mcp
```

**Codex**

```bash
codex mcp add memecub --url https://memecub.com/mcp
```

**Gemini CLI**

```bash
gemini mcp add --transport http memecub https://memecub.com/mcp
```

**Cursor** (`~/.cursor/mcp.json`)

```json
{ "mcpServers": { "memecub": { "url": "https://memecub.com/mcp" } } }
```

**VS Code** (`.vscode/mcp.json`)

```json
{ "servers": { "memecub": { "type": "http", "url": "https://memecub.com/mcp" } } }
```

**Claude Desktop / claude.ai**: Settings → Connectors → Add custom connector → `https://memecub.com/mcp`

**ChatGPT**: Settings → Apps & Connectors → Advanced → turn on developer mode, then create a connector with `https://memecub.com/mcp`

Cherry Studio, Dify, n8n and other clients that take a remote MCP server work the same way. Step-by-step guides for each tool: [memecub.com/developers](https://memecub.com/developers).

Then just ask:

> Add 3 memes to draft.md where they fit.
>
> Find me a facepalm meme, commercial use only.
>
> 给这篇文章配几张表情包。

## MCP tools

| Tool | What it does |
|---|---|
| `search_memes` | Search by reaction, feeling or character. Filters: `commercial_only`, `no_credit`, `kind` (meme, gif, emoji, artwork, photo), `min_size` |
| `match_article` | Read an article, pick the spots that deserve a meme, return the article with images inserted (needs a key) |
| `get_meme` | Full details for one image: license, source, author, credit line, tags |
| `list_categories` | Library categories |

You can try it without a key (20 searches a day per IP). Add `Authorization: Bearer <key>` (run `npx memecub login`, or create one at [memecub.com/dashboard](https://memecub.com/dashboard?tab=keys)) to use your credits: a free account gets 1,000 a month, a search costs 1 and `match_article` costs 20 per image it places. Plans and credit packs: [memecub.com/pricing](https://memecub.com/pricing).

## Agent skill

[`skills/memecub/SKILL.md`](skills/memecub/SKILL.md) teaches an agent to place memes into writing with plain `curl`. No MCP, no dependencies.

```bash
npx skills add https://memecub.com                  # pick your agents interactively
npx skills add https://memecub.com -g -a claude-code  # or target one: codex, cursor, gemini-cli, openclaw…
npx skills add liyupi/memecub                       # same skill, from this repo
```

memecub.com publishes the skill at [`/.well-known/agent-skills/index.json`](https://memecub.com/.well-known/agent-skills/index.json), so the site URL is enough.

Or by hand:

```bash
# Claude Code: ~/.claude/skills   Codex: ~/.codex/skills   Cursor: ~/.cursor/skills
mkdir -p ~/.claude/skills/memecub
curl -s https://memecub.com/skill.md -o ~/.claude/skills/memecub/SKILL.md
```

## REST API

```bash
curl -sG https://memecub.com/api/v1/search --data-urlencode "q=facepalm" -d limit=1
```

```jsonc
{
  "data": [{
    "title": "Facepalm",
    "url": "https://gpic.code-nav.cn/memecub/public/12vw20qg0awo.jpg",
    "page_url": "https://memecub.com/meme/12vw20qg0awo-facepalm",
    "width": 679, "height": 600, "kind": "meme",
    "license": { "code": "web", "commercial_use": false, "attribution_required": false },
    "markdown": "![Facepalm](https://gpic.code-nav.cn/memecub/public/12vw20qg0awo.jpg)"
  }]
}
```

All endpoints and limits: [memecub.com/developers](https://memecub.com/developers).

## CLI and JS client

[`memecub` on npm](https://www.npmjs.com/package/memecub), source in [`cli/`](cli). Node 18+.

```bash
npx memecub search "facepalm" --limit 5
npm i -g memecub                                  # or install the `memecub` command
memecub search "facepalm" --limit 5
memecub search "mind blown" --commercial          # only images cleared for commercial use
memecub match ./article.md --count 4 > article.with-memes.md
```

```ts
import { MemecubClient } from "memecub";

const client = new MemecubClient("https://memecub.com", process.env.MEMECUB_API_KEY);
const { data } = await client.search({ q: "mind blown", limit: 5, commercialOnly: true });
```

## The website

Everything the agent sees is also browsable at [memecub.com](https://memecub.com): search, topic pages, one-click copy and download, and the article tool in the browser.

| Home | Topic page | Agent setup |
|---|---|---|
| [![memecub home page](assets/home-en.png)](https://memecub.com) | [![Drake memes topic page](assets/topic-en.png)](https://memecub.com/tag/drake) | [![Setup guide for AI agents](assets/developers-en.png)](https://memecub.com/developers) |

## FAQ

**Is it free?** Browsing memecub.com is free, and so is light API use: 20 keyless searches a day, or 1,000 credits a month with a free account. Heavier use runs on [plans and credit packs](https://memecub.com/pricing).

**Can I use the images commercially?** Check `license.commercial_use` on each result. Memes collected from the web are `false`: copyright belongs to their creators and the source link is kept. Openly licensed images (CC0, public domain, CC BY and similar) are `true` and come with the credit line when the license needs one. Pass `commercial_only: true` (MCP) or `commercial=1` (REST) to get only those.

**Is the website open source?** No. This repository holds the integrations (MCP descriptor, Agent Skill, CLI and client). The site and its data pipeline are run by memecub.

**Found a problem with an image?** Use the report button on its page, or see [memecub.com/dmca](https://memecub.com/dmca).

## License

Code in this repository is [MIT](LICENSE). Images are not covered by MIT; each result carries its own license.

If memecub saves your agent a trip to the image search, a ⭐ helps others find it.
