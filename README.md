# geo402-mcp

Let Claude, Cursor or any MCP client **read any public web page as it appears from another country**: localized prices, the local version of a site, country-specific availability, or how your own site looks abroad. Pages come back as clean markdown.

Powered by [Geo402](https://geo402.com): residential IPs in 190+ countries, paid per page (about **$0.005**) in USDC on Base via the x402 protocol. No account, no API key, no subscription. You're only charged when a page loads.

## Tools

| Tool | What it does | Cost |
|---|---|---|
| `fetch_page_from_country` | One page from one country, as markdown, text or HTML | ~$0.005 |
| `compare_page_across_countries` | The same page from 2-5 countries, side by side | ~$0.005 per country |
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
