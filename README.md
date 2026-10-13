# memecub

<img src="assets/logo.png" alt="memecub" width="96" align="right">

Memes, Chinese 表情包 and reaction images for AI agents and writers. Search by feeling (`facepalm`, `无语`, `摸鱼`), or hand over a whole article and get it back with memes placed where they fit. Every result says whether it is cleared for commercial use and comes with a ready Markdown snippet, including the credit line when the license needs one.

Website: [memecub.com](https://memecub.com) · Docs: [memecub.com/developers](https://memecub.com/developers)

[中文说明](#中文说明)

## Remote MCP server

```
https://memecub.com/mcp
```

Streamable HTTP, no install. Searching works without a key; add `Authorization: Bearer <key>` (create one at [memecub.com/library](https://memecub.com/library#keys)) for higher limits, your private library and `match_article`.

| Tool | What it does |
|---|---|
| `search_memes` | Search by reaction, feeling or character; filter to commercially usable or credit-free images |
| `get_meme` | Full details for one image: license, source, author, credit line, tags |
| `match_article` | Read an article, pick the spots that deserve a meme, return the article with images inserted (needs a key) |
| `list_categories` | Library categories |

**Claude Code**

```bash
claude mcp add --transport http memecub https://memecub.com/mcp
```

**Cursor** (`~/.cursor/mcp.json`)

```json
{ "mcpServers": { "memecub": { "url": "https://memecub.com/mcp" } } }
```

**VS Code** (`.vscode/mcp.json`)

```json
{ "servers": { "memecub": { "type": "http", "url": "https://memecub.com/mcp" } } }
```

**Claude Desktop / claude.ai**: Settings → Connectors → Add custom connector → `https://memecub.com/mcp`.

## Agent skill

[`skills/memecub/SKILL.md`](skills/memecub/SKILL.md) teaches an agent how to place memes into a piece of writing using plain `curl`, no MCP needed:

```bash
npx skills add liyupi/memecub
```

Or by hand for Claude Code:

```bash
mkdir -p ~/.claude/skills/memecub
curl -s https://memecub.com/skill.md -o ~/.claude/skills/memecub/SKILL.md
```

## REST API

```bash
curl -sG https://memecub.com/api/v1/search --data-urlencode "q=mind blown" -d limit=5
```

See [memecub.com/developers](https://memecub.com/developers) for all endpoints and limits.

## CLI and JS client

Source in [`cli/`](cli). Usage:

```bash
memecub search "facepalm" --limit 5
memecub search "无语" --kind meme --json
memecub match ./article.md --count 4 > article.with-memes.md
```

## Licensing

The code in this repository is MIT licensed. Images are not: each result carries its own license. Memes collected from the web are marked `commercial_use: false` and keep a link to their source; openly licensed images are marked `commercial_use: true` with their license and credit line.

---

## 中文说明

memecub 是给 AI Agent 和创作者用的表情包、梗图配图引擎。可以按情绪搜（“无语”“裂开”“摸鱼”），也可以把整篇文章交给它，返回自动插好表情包的文章。每张图都注明能否商用，并附带现成的 Markdown（需要署名时已包含署名）。

- 远程 MCP：`https://memecub.com/mcp`，免安装，配置方法见上文
- Agent Skill：[`skills/memecub/SKILL.md`](skills/memecub/SKILL.md)，只用 curl，不依赖 MCP
- REST API 和额度说明：[memecub.com/developers](https://memecub.com/developers)
- 网站：[memecub.com/zh](https://memecub.com/zh)

本仓库代码采用 MIT 许可；图片不适用 MIT，以每张图自带的许可证为准。网络收集的表情包标为不可商用（`commercial_use: false`），版权归原作者。
