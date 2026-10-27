---
name: geo402-geo-fetch
description: Fetch any public web page from a residential IP in a chosen country (190+ countries) and get clean markdown, text or HTML, paid per page in USDC (x402 v2). Use when an agent needs localized prices, the local version of a site, country-specific or geo-restricted public content, or a page that differs by visitor location.
---

# Geo402: geo web fetch for agents

Base URL: https://geo402.com · Payment: x402 v2, USDC on eip155:8453 (Base) · Terms: https://geo402.com/terms

## Fetch
`GET /api/fetch?url=https://example.com&country=de&format=markdown` (or POST the same fields as JSON)
- `url` (required): a public http(s) page. `country`: 2-letter code (default any). `format`: markdown (default), text or html.
- Price: $0.005 per page, charged only if the page loads. The 402 response shows the price first.
- Returns `final_url`, `status`, `title`, `content`, `bytes`, `truncated` (pages over 2 MB are cut).

## Before paying (free)
- `GET /api/fetch/check?url=...&country=...` tells you if a URL is allowed and why not.
- `GET /api/sample/fetch` shows a real result. `GET /api/countries` lists codes.

## What is not possible
- Sign-in, account, checkout and payment pages; banking, email, identity and government login services.
- Pages disallowed by the site's robots.txt.
- CAPTCHA solving or bypassing bot protection: if a site blocks or challenges, you get HTTP 424 and are not charged.

## Tips
Use markdown for LLM reading (smallest, cleanest). Fetch the specific page you need rather than crawling. Rate limits apply per site and per wallet; on 429, wait for Retry-After.
