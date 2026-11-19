#!/usr/bin/env node
// Geo402 MCP server: lets AI assistants (Claude, Cursor, ...) search Google and read any public web page as they appear from another country.
// Each tool call is paid automatically in USDC on Base from YOUR wallet via the x402 protocol,
// within the per-call cap and session budget you set.
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { privateKeyToAccount } = require("viem/accounts");
const { createPublicClient, http, parseAbi } = require("viem");
const { base, baseSepolia } = require("viem/chains");
const { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } = require("@x402/fetch");
const { ExactEvmScheme } = require("@x402/evm/exact/client");
const { AsyncLocalStorage } = require("async_hooks");
const callContext = new AsyncLocalStorage(); // tracks the exact amount authorized within each tool call

const VERSION = "1.3.0";
const API = (process.env.GEO402_URL || "https://geo402.com").replace(/\/$/, "");
const TESTNET = process.env.GEO402_NETWORK === "base-sepolia";
const NETWORK = TESTNET ? "eip155:84532" : "eip155:8453";
const USDC = TESTNET ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e" : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const MAX_PER_CALL = Number(process.env.GEO402_MAX_PER_CALL || "0.05"); // USD
const BUDGET = Number(process.env.GEO402_BUDGET || "2"); // USD per session (until the assistant restarts)
const KEY = (process.env.GEO402_PRIVATE_KEY || process.env.ASIN402_PRIVATE_KEY || "").trim(); // one small wallet can pay for both services

let account = null;
if (KEY) {
  try { account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`); }
  catch { console.error("[geo402] GEO402_PRIVATE_KEY is not a valid private key"); }
}

const session = { spent: 0, reserved: 0, calls: 0, payments: [] };
const usd = (atomic) => Number(atomic) / 1e6;

let payFetch = null;
if (account) {
  const client = x402Client.fromConfig({
    schemes: [{ network: NETWORK, client: new ExactEvmScheme(account) }], // only Base (or Base Sepolia in test mode)
    spendControls: { maxAmountPerPayment: `$${MAX_PER_CALL}` },
  });
  client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
    const price = usd(selectedRequirements.amount);
    if (price > MAX_PER_CALL) return { abort: true, reason: `Price $${price} exceeds the per-call cap of $${MAX_PER_CALL} (GEO402_MAX_PER_CALL).` };
    if (session.spent + session.reserved + price > BUDGET + 1e-9) return { abort: true, reason: `Session budget reached: spent $${session.spent.toFixed(3)} of $${BUDGET} (GEO402_BUDGET). Restart the assistant or raise the budget.` };
    const ctx = callContext.getStore();
    if (ctx) { ctx.authorized = price; session.reserved += price; }
  });
  payFetch = wrapFetchWithPayment(fetch, client);
}

const NO_WALLET = [
  "No wallet configured, so paid Geo402 tools are unavailable.",
  "Set GEO402_PRIVATE_KEY in this MCP server's environment to the private key of a wallet holding a few dollars of USDC on Base.",
  "Use a dedicated wallet with a small balance, never your main wallet. Optional: GEO402_MAX_PER_CALL (default 0.05) and GEO402_BUDGET (default 2) in USD.",
].join(" ");

const MAX_TEXT = Number(process.env.GEO402_MAX_RESPONSE_CHARS || 80000);
const text = (obj) => {
  let s = typeof obj === "string" ? obj : JSON.stringify(obj, null, 1);
  if (s.length > MAX_TEXT) s = s.slice(0, MAX_TEXT) + `\n... [truncated ${s.length - MAX_TEXT} chars; use format=text, or fewer countries]`;
  return { content: [{ type: "text", text: s }] };
};
const fail = (msg) => ({ content: [{ type: "text", text: msg }], isError: true });

function qs(params) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, typeof v === "boolean" ? (v ? "1" : "0") : Array.isArray(v) ? v.join(",") : typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

async function call(path, params = {}, body) {
  if (!payFetch) return fail(NO_WALLET);
  const ctx = { authorized: 0 };
  try { return await callContext.run(ctx, () => doCall(path, params, body, ctx)); }
  finally { session.reserved = Math.max(0, session.reserved - ctx.authorized); }
}

async function doCall(path, params, body, ctx) {
  const url = API + path + qs(params);
  let res;
  try {
    res = await payFetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  } catch (e) {
    const m = String(e.message || e);
    if (/budget reached/i.test(m)) return fail(m.slice(m.indexOf("Session budget")));
    if (/rejected by spend controls|All payment requirements were rejected/i.test(m)) return fail(`This call costs more than your per-call cap of $${MAX_PER_CALL} (GEO402_MAX_PER_CALL), so it was not paid.`);
    if (/per-call cap/i.test(m)) return fail(m.slice(m.indexOf("Price")));
    return fail(`Payment or network error (not charged): ${m}`);
  }
  session.calls++;
  const receipt = res.headers.get("payment-response");
  let paid = 0;
  if (receipt) {
    try {
      const r = decodePaymentResponseHeader(receipt);
      if (r.success) {
        paid = ctx.authorized; // exact amount signed for this call; only counted once settled
        session.payments.push({ path, usd: paid, tx: r.transaction });
      }
    } catch { /* ignore malformed receipt */ }
  }
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw; }
  session.spent = Math.round((session.spent + paid) * 1e6) / 1e6;
  if (res.status === 402) return fail(`Payment was not completed: ${typeof data === "object" ? JSON.stringify(data) : raw}`.slice(0, 2000));
  if (res.status >= 400) return fail(`Geo402 error ${res.status} (you were not charged): ${typeof data === "object" ? data.error || JSON.stringify(data) : raw}`.slice(0, 2000));
  if (data && typeof data === "object" && !Array.isArray(data)) data._session = { paid_usd: paid, spent_this_session_usd: session.spent, budget_usd: BUDGET };
  return text(data);
}

// ---------- Schemas ----------
const url = z.string().url().describe("Public http(s) page, e.g. https://www.amazon.de/dp/B0CHX3QBCH");
const country = z.string().regex(/^[A-Za-z]{2}$/, "2-letter country code").optional().describe("Country of the residential exit IP, e.g. de, jp, br (default: any)");
const format = z.enum(["markdown", "text", "html"]).optional().describe("markdown (default, best for reading), text, or raw html");
const ro = { readOnlyHint: true, openWorldHint: true };

const server = new McpServer({ name: "geo402", version: VERSION });

// Free GET (no payment): check, countries, sample
async function freeGet(path, params = {}) {
  try {
    const r = await fetch(API + path + qs(params), { headers: { Accept: "application/json" } });
    return text(await r.json());
  } catch (e) { return fail(`Network error: ${e.message}`); }
}

const searchCountry = z.string().regex(/^[A-Za-z]{2}$/, "2-letter country code").optional().describe("Google market to search from, e.g. ca, fr, de, jp (default us)");
const lang = z.string().optional().describe("Result language, e.g. fr, en, de, pt-br (default: the market's)");
const location = z.string().optional().describe("With type=places: the city, e.g. \"Montreal, Quebec, Canada\"");

server.registerTool("search_from_country", {
  title: "Google search as seen from a country",
  description: "Search Google as a user in the chosen country and language sees it. Returns ranked results (title, url, domain, snippet), answer box, knowledge graph, People Also Ask and related searches; or news, Maps places (name, address, rating, phone, website) or images. Use for local research, market or competitor checks, local SEO rankings, finding local businesses, or any question where results differ by country. About $0.004 per search, charged only on success.",
  inputSchema: {
    q: z.string().min(1).max(400).describe("Search query"),
    country: searchCountry, lang, location,
    type: z.enum(["web", "news", "places", "images"]).optional().describe("web (default), news, places (Maps listings) or images"),
    num: z.number().int().min(1).max(20).optional().describe("Results, 1-20 (default 10)"),
  }, annotations: ro,
}, async ({ q, country, lang, location, type, num }) => {
  const params = { q, country: country && country.toLowerCase(), lang, location, type, num };
  if (payFetch) return call("/api/search", params);
  try {
    const r = await fetch(API + "/api/search" + qs({ ...params, trial: 1 }), { headers: { Accept: "application/json" } });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return text(j);
    if (r.status === 402) return fail(`${j.free_trial || "The free trial is used up."} ${NO_WALLET}`);
    return fail(`Geo402 error ${r.status} (not charged): ${j.error || JSON.stringify(j)}`.slice(0, 2000));
  } catch (e) { return fail(`Network error: ${e.message}`); }
});

server.registerTool("compare_search_across_countries", {
  title: "Compare Google results across countries",
  description: "Run one Google search in 2-5 countries at once: ranked results per country, the sites that rank in several of them, and (optional) where a given domain ranks in each country. For international SEO, market research and competitor checks. About $0.004 per country, one payment; not charged if every country fails.",
  inputSchema: {
    q: z.string().min(1).max(400).describe("Search query"),
    countries: z.array(z.string().regex(/^[A-Za-z]{2}$/)).min(2).max(5).describe("2-5 country codes, e.g. [\"us\",\"ca\",\"fr\"]"),
    domain: z.string().optional().describe("Optional site to track, e.g. example.com"),
    lang: z.string().optional().describe("Optional language for every country (default: each market's own)"),
    num: z.number().int().min(1).max(20).optional().describe("Results per country (default 10)"),
  }, annotations: ro,
}, async ({ q, countries, domain, lang, num }) => call("/api/search/compare", {}, { q, countries: countries.map((c) => c.toLowerCase()), domain, lang, num }));

server.registerTool("search_and_read", {
  title: "Search from a country and read the top results",
  description: "One call: search Google as seen from the chosen country, then open the top 1-5 results through residential IPs in that same country and return each page as clean markdown (trimmed to max_chars). Results that are blocked, sign-in pages or disallowed by robots.txt are skipped and the next result is read. Best for researching a question with local sources. About $0.004 + $0.005 per page read, one payment; not charged if no page loads.",
  inputSchema: {
    q: z.string().min(1).max(400).describe("Search query"),
    country: searchCountry, lang,
    read: z.number().int().min(1).max(5).optional().describe("How many top results to read (default 3)"),
    max_chars: z.number().int().min(500).max(20000).optional().describe("Max characters per page (default 4000)"),
  }, annotations: ro,
}, async ({ q, country, lang, read, max_chars }) => call("/api/search/read", {}, { q, country: country && country.toLowerCase(), lang, read, max_chars }));

server.registerTool("fetch_page_from_country", {
  title: "Read a web page as it appears from a country",
  description: "Fetch one public web page through a residential IP in the chosen country (optionally a city or US state) and return it as clean markdown (or text/html), with title, final URL, status, and the product price/currency/availability extracted when the page has product data. Use for localized prices, the local version of a site, country-specific availability or content, or checking how a site looks abroad. Charged only if the page loads (about $0.005). Public pages only: sign-in, checkout and payment pages are refused, robots.txt is respected, and sites that show a CAPTCHA return an error (not charged).",
  inputSchema: {
    url, country, format,
    city: z.string().optional().describe("Optional city for the exit IP, needs country (e.g. berlin). Small extra charge."),
    state: z.string().optional().describe("Optional US state, needs country=us (e.g. texas). Small extra charge."),
  }, annotations: ro,
}, async ({ url, country, format, city, state }) => {
  const params = { url, country: country && country.toLowerCase(), format, city, state };
  if (payFetch) return call("/api/fetch", params);
  // No wallet yet: use the free trial (one page per day) so new users can see it work
  if (city || state) return fail(NO_WALLET);
  try {
    const r = await fetch(API + "/api/fetch" + qs({ ...params, trial: 1 }), { headers: { Accept: "application/json" } });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return text(j);
    if (r.status === 402) return fail(`${j.free_trial || "The free trial is used up."} ${NO_WALLET}`);
    return fail(`Geo402 error ${r.status} (not charged): ${j.error || JSON.stringify(j)}`.slice(0, 2000));
  } catch (e) { return fail(`Network error: ${e.message}`); }
});

server.registerTool("compare_page_across_countries", {
  title: "Compare one page across countries",
  description: "Fetch the same public page from 2-5 countries in one paid call and get each version side by side: status, redirect, language, the extracted product price converted to USD, and an excerpt (or full content), plus the cheapest country. About $0.005 per country, one payment; not charged if no country loads.",
  inputSchema: {
    url,
    countries: z.array(z.string().regex(/^[A-Za-z]{2}$/)).min(2).max(5).describe("2-5 country codes, e.g. [\"us\",\"de\",\"jp\"]"),
    include_content: z.boolean().optional().describe("true = full page content per country (default: short excerpts)"),
    format,
  }, annotations: ro,
}, async ({ url, countries, include_content, format }) => call("/api/compare", {}, { url, countries: countries.map((c) => c.toLowerCase()), include_content: !!include_content, format: format || "text" }));

server.registerTool("check_url", {
  title: "Check if a URL can be fetched (free)",
  description: "Free. Says whether a URL is allowed (public page, not a blocked service, allowed by robots.txt) before paying. The site may still block the actual request; you are only charged if the page loads.",
  inputSchema: { url, country }, annotations: ro,
}, async ({ url, country }) => freeGet("/api/fetch/check", { url, country: country && country.toLowerCase() }));

server.registerTool("list_countries", {
  title: "Available countries (free)",
  description: "Free. All 2-letter country codes available for the exit IP.",
  inputSchema: {}, annotations: ro,
}, async () => freeGet("/api/countries"));

server.registerTool("wallet_status", {
  title: "Geo402 wallet and spending",
  description: "Free. Shows the paying wallet address, its USDC balance on Base, spending this session and remaining budget.",
  inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: true },
}, async () => {
  if (!account) return fail(NO_WALLET);
  let balance = null;
  try {
    const pc = createPublicClient({ chain: TESTNET ? baseSepolia : base, transport: http() });
    const b = await pc.readContract({ address: USDC, abi: parseAbi(["function balanceOf(address) view returns (uint256)"]), functionName: "balanceOf", args: [account.address] });
    balance = usd(b);
  } catch { /* RPC unavailable */ }
  return text({
    wallet: account.address, network: TESTNET ? "Base Sepolia (testnet)" : "Base", usdc_balance: balance,
    spent_this_session_usd: session.spent, budget_usd: BUDGET, remaining_usd: Math.max(0, Math.round((BUDGET - session.spent) * 1e6) / 1e6),
    max_per_call_usd: MAX_PER_CALL, paid_calls: session.payments.length, service: API,
  });
});

(async () => {
  await server.connect(new StdioServerTransport());
  console.error(`[geo402] MCP server ${VERSION} ready | ${API} | ${account ? "wallet " + account.address : "no wallet (paid tools disabled)"} | cap $${MAX_PER_CALL}/call, budget $${BUDGET}/session`);
})().catch((e) => { console.error("[geo402] fatal:", e); process.exit(1); });
