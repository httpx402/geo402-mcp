# Geo402 listing kit (copy/paste)

Replace YOURNAME with your GitHub username.

## Common text

- Name: Geo402
- Short (under 100 chars): Read any public web page as seen from another country, as clean markdown. Pay per page.
- Website: https://geo402.com
- GitHub: https://github.com/YOURNAME/geo402-mcp
- npm: geo402-mcp
- MCP Registry: com.geo402/mcp
- Network: Base mainnet, USDC, x402 v2
- Price: $0.005 per page, charged only if the page loads
- Tags: web-fetch, geo, localization, residential-proxy, price-comparison, markdown, x402, mcp

Long description:
Geo402 lets AI agents fetch any public web page through a residential IP in a chosen country (190+ countries) and get it back as clean markdown, text or HTML: localized prices, the local version of a site, country-specific availability, or how a site looks to visitors abroad. $0.005 per page in USDC on Base via x402, charged only when the page loads. No account or API key. Respects robots.txt, never solves CAPTCHAs, and refuses sign-in, checkout, payment, banking, email and identity pages. MCP tools: fetch_page_from_country, compare_page_across_countries, check_url, list_countries.

Endpoint URLs for x402 directories:
- GET https://geo402.com/api/fetch?url=https://example.com&country=de
- POST https://geo402.com/api/fetch  body {"url":"https://example.com","country":"de"}
- Free sample: https://geo402.com/api/sample/fetch

---

## x402 directories (no GitHub needed)

1. **agentic.market / Bazaar**: automatic after the first paid call settles (run the two test fetches).
2. **x402scan**: https://www.x402scan.com, "Add Server", enter `geo402.com`.
3. **402 Index**: on the server, `cd ~/geo402 && node deploy/verify-402index.js` (claims and verifies the domain).
4. **x402 List**: https://x402-list.com/submit. Service name `Geo402`, base URL `https://geo402.com`, website `https://geo402.com`, category Data or Web, the long description above, endpoint paths:
   ```
   GET /api/fetch?url=https://example.com&country=de
   POST /api/fetch
   ```
   One submission per email per 7 days: use a different email than for ASIN402, or wait a week.
5. **nohumans.directory**: on the server, `cd ~/geo402 && node deploy/list-nohumans.js`, then `--pay` if it asks for the $0.25 fee (paid from the keep-alive test wallet).
6. **Poncho**: rescan with the domain; /openapi.json has info.contact.email.
7. **awesome-x402** (github.com/xpaysh/awesome-x402) pull request line:
   - [Geo402](https://geo402.com) - Fetch any public web page from a residential IP in 190+ countries as clean markdown. x402 v2 on Base, $0.005 per page, charged only on success. MCP: `npx geo402-mcp`.

---

## MCP directories (need this repo on GitHub first)

8. **Glama**: "Add Server" with https://github.com/YOURNAME/geo402-mcp (the Dockerfile lets Glama build and score it).
9. **awesome-mcp-servers** (github.com/punkpeye/awesome-mcp-servers), after Glama lists it, in the "Browser Automation" or "Search & Data Extraction" section:
   - [YOURNAME/geo402-mcp](https://github.com/YOURNAME/geo402-mcp) [![geo402-mcp MCP server](https://glama.ai/mcp/servers/YOURNAME/geo402-mcp/badges/score.svg)](https://glama.ai/mcp/servers/YOURNAME/geo402-mcp) 📇 ☁️ - Read any public web page as it appears from another country (residential IPs, 190+ countries) as clean markdown; compare one page across countries. Paid per page in USDC via x402.
10. **Smithery**: "Add server", pick the repo (smithery.yaml included). Secret field: privateKey.
11. **mcp.so**: "Submit", paste the repo URL.
12. **MCP Market** (mcpmarket.com/submit): submit twice, as **MCP Server** and as **Agent Skill** (skills/geo402-geo-fetch). Try Now link: https://geo402.com/api/sample/fetch
