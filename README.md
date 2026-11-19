# geo402-mcp

Let Claude, Cursor or any MCP client **search Google and read any public web page as they appear from another country**: local search results and businesses, localized prices, the local version of a site, or how your own site looks abroad. Pages come back as clean markdown.

Powered by [Geo402](https://geo402.com): 190+ countries, paid per call (about **$0.004** per search, **$0.005** per page) in USDC on Base via the x402 protocol. No account, no API key, no subscription. You're only charged when the call succeeds.

## Hosted server (no install, no private key)

Connect any MCP client to **`https://geo402.com/mcp`** (Streamable HTTP). Free tools (`check_url`, `list_countries`, `free_sample`, `how_to_pay`) work without a wallet; paid tools are paid per call with x402 MCP payments (for example with [`@x402/mcp`](https://www.npmjs.com/package/@x402/mcp)), charged only on success.

```bash
claude mcp add geo402 --transport http https://geo402.com/mcp
```

Prefer to run it locally with your own wallet? Use the npm package below.

## Tools

| Tool | What it does | Cost |
|---|---|---|
| `search_from_country` | Google results as seen from a country and language: web, news, images, or Maps places in any city | ~$0.004 |
| `compare_search_across_countries` | One search in 2-5 countries: ranks per country, sites ranking in several, and your domain's rank in each | ~$0.004 per country |
| `search_and_read` | Search from a country, then read the top 1-5 results from that same country as markdown, in one payment | ~$0.004 + $0.005 per page |
| `fetch_page_from_country` | One page from one country (or city / US state), as markdown, text or HTML, with the product price extracted | ~$0.005 |
| `compare_page_across_countries` | The same page from 2-5 countries in one payment, with prices in USD and the cheapest country | ~$0.005 per country |
| `check_url` | Is this URL allowed? (rules + robots.txt) | free |
| `list_countries` | Available country codes | free |
| `wallet_status` | Wallet balance and spending | free |

Example questions:
- "What does this product cost on amazon.de vs amazon.fr vs amazon.co.uk?"
- "Show me the Japanese version of example.com's pricing page."
- "Is this item available for shipping when viewed from Brazil?"

## Setup

**1. Create a small dedicated wallet** (MetaMask, Rabby, Coinbase Wallet), export its private key, and send it a few dollars of **USDC on Base**. Never use your main wallet.

**2. Add to your MCP client** (Claude Desktop: Settings, Developer, Edit Config; Cursor: `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "geo402": {
      "command": "npx",
      "args": ["-y", "geo402-mcp"],
      "env": {
        "GEO402_PRIVATE_KEY": "0xYOUR_DEDICATED_WALLET_KEY",
        "GEO402_BUDGET": "2",
        "GEO402_MAX_PER_CALL": "0.05"
      }
    }
  }
}
```

**No wallet yet?** Leave `GEO402_PRIVATE_KEY` out and `search_from_country` or `fetch_page_from_country` uses your one free call per day, so you can see it work first.

**3. Restart the assistant** and ask "check my Geo402 wallet" to confirm.

## Spending limits

| Variable | Default | Meaning |
|---|---|---|
| `GEO402_BUDGET` | 2 | Max USD per session (until the assistant restarts) |
| `GEO402_MAX_PER_CALL` | 0.05 | Max USD for a single page |

Calls over a limit are refused before anything is paid. Already using [asin402-mcp](https://www.npmjs.com/package/asin402-mcp)? The same wallet works: if `GEO402_PRIVATE_KEY` is not set, `ASIN402_PRIVATE_KEY` is used.

## Rules

Public pages only. Sign-in, account, checkout and payment pages and banking, email and identity services are refused; robots.txt is respected; CAPTCHAs are never solved (a blocked page returns an error and is not charged). Terms: https://geo402.com/terms

## License

MIT

## Agent skill

`skills/geo402-geo-fetch/SKILL.md` teaches any agent when and how to call Geo402 directly over HTTP. Copy the folder into your agent's skills directory, or load https://geo402.com/skill.md.
