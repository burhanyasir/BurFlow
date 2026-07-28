# BrightSmile AI — Troubleshooting Guide

Common issues and how to resolve them.

## The Website Scanner fails

**Symptoms**: Scanner result shows status `failed` with an error.

**Causes & fixes**:

- **ECONNREFUSED** — the URL is unreachable. Check the domain spelling and that the site is public (not behind a login or firewall).
- **Timeout** — the server took too long. Retry; if it persists, the site may be very slow or blocking bots. Try a more specific page URL.
- **No services extracted** — the page may not mention service keywords. Manually add services in the config, or scan a services/page URL.

The scanner extracts from visible page text only; it does not execute JavaScript-rendered content.

## The widget doesn't appear on the client site

- Confirm the snippet is placed **before** `</body>`.
- Confirm `/widget.js` (or the tenant's embed URL) is reachable from the client's site.
- Check the browser console for a 404 or CORS error.
- Verify the tenant `is_active = 1`.

## The chatbot gives wrong or repeated answers

- This is handled by the conversation engine's repetition and confusion guards. If a client reports it, re-run the **Website Scanner** to refresh FAQs, or update the config.
- Check the conversation in the console's Conversations view for the exact transcript.

## Styling looks wrong

- The widget inherits `primaryColor` / `secondaryColor` from the tenant config. Update **Tenants & Branding** and re-deploy.
- The widget is self-contained; it won't be affected by the client's CSS except in rare `z-index` conflicts. Increase `#bsw-root` z-index if needed.

## Server won't start (EADDRINUSE)

Another process is using port 3456. Find and stop it, or set `PORT` to another value: `PORT=4000 npm start`.

## Database locked / WAL errors

SQLite uses WAL mode. Ensure only one server process writes the DB. Stop all `node` processes before deleting `agency.db`.

## Health check fails

Open `GET /api/health`. If the process is up but a check fails, review logs for memory pressure or a stuck fuzzer campaign (`/api/fuzzer/stop` to clear).

## Still stuck?

Capture the browser console output and the relevant API response, then contact support with the client ID and timestamp.
