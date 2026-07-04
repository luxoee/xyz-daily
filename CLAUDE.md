# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Start the Vite dev server for static pages: `npm run dev`
- Type-check only: `npm run typecheck`
- Build for Cloudflare Pages: `npm run build`
- Preview the built static app locally: `npm run preview`
- Run the built app with Cloudflare Pages Functions locally: `npm run pages:dev`
- Run Pages Functions locally with the admin token binding: `CARD_ADMIN_TOKEN=<token> npm run pages:dev:admin`
- Run Pages Functions locally with Hotmail bindings: `HOTMAIL_API_KEY=<key> HOTMAIL_API_BASE=https://mail.dgx.cc.cd npm run pages:dev:hotmail`
- Deploy to Cloudflare Pages: `npm run deploy`
- Deploy preview branch: `npm run deploy:preview`
- Initialize the D1 schema used by card APIs: `npx wrangler d1 execute xyz-daily-cards --remote --file=./schema/cards.sql`

There is currently no lint script or test runner configured in `package.json`; use `npm run typecheck` and `npm run build` as the main local validation steps. Single-test commands are not available until a test runner is added.

## Architecture

This is a strict TypeScript, multi-page Vite app deployed to Cloudflare Pages with Pages Functions. The Vite build inputs are declared in `vite.config.ts`; each HTML entry loads a page-specific module from `src/` and the shared stylesheet `src/styles.css`.

### Client pages and flows

- `/` loads `src/hotmail.ts`, the Hotmail/Outlook mail-code homepage. It posts an email to `/api/hotmail/manual_mail`, displays the newest extracted verification code, and redirects legacy root `?p=` Kedaya links to `/kedaya/?p=...`.
- `/kedaya/` and `/kedaya/admin/` load `src/kedaya-admin.ts`, which queries Kedaya mail codes through `/api/kedaya/manual_mail`. The page supports encrypted `p` links containing an email and also has a `?debug=true` raw-response panel.
- `/kedaya/gen/` and `/kgen/` load `src/kedaya-generator.ts`, which calls `/api/kedaya/link/generate` to generate encrypted Kedaya email links.
- `/keria/` loads `src/main.ts`, the Keria mail-code flow. It expects an encrypted `p` query parameter, decrypts it with `src/crypto.ts`, checks server time through `/api/time`, exchanges the card/code for mail credentials through `/api/pickup/mail-keys`, caches credentials in `localStorage` via `src/cache.ts`, then fetches verification codes through `/api/pickup/mail-code`.
- `/gen/` loads `src/generator.ts` and creates encrypted Keria access links client-side for a 7-minute default duration. `generator.html` is only a redirect shell to `/gen/`.
- `src/api.ts`, `src/types.ts`, `src/time.ts`, `src/cache.ts`, and `src/crypto.ts` are shared browser-side helpers. `VITE_API_BASE` can override same-origin API calls; by default it is empty for Cloudflare Pages.

### Cloudflare Pages Functions

- `functions/api/hotmail/manual_mail.js` adapts the Hotmail/Outlook homepage to the outlookEmail external API. It calls `GET /api/external/emails` on `HOTMAIL_API_BASE` with `X-API-Key: HOTMAIL_API_KEY`, requests `folder=all&top=5`, and returns a normalized `{ ok, code, messages, ... }` response. Keep the API key server-side only.
- `functions/api/pickup/mail-keys.js` and `functions/api/pickup/mail-code.js` proxy form requests to `https://plus.keria.cc.cd` and strip unsafe response headers. Vite dev only proxies `/api/pickup` and mocks `/api/time`; run `npm run pages:dev` when testing the full Pages Functions stack.
- `functions/api/time.js` returns no-store server time used to validate expiring links.
- Card issuance uses the D1 table in `schema/cards.sql` with binding `xyz_daily_cards` from `wrangler.toml`. `functions/api/cards/import.js` creates one-time card links, `functions/card/[token].js` atomically claims an issued card and redirects to a `/keria/?p=...` access link, and `functions/api/cards/resolve.js` resolves a card link/token back to its row or code for admin use.
- Admin-only card APIs call `requireAdmin()` in `functions/_shared/cards.js` and require `CARD_ADMIN_TOKEN` as a bearer token.
- Kedaya mail lookup is handled by `functions/api/kedaya/_shared.js` and `functions/api/kedaya/manual_mail.js`, which validate encrypted email tokens and proxy to `https://codex.kedaya.xyz/api/manual_mail`.
- `functions/api/kedaya/link/generate.js` creates Kedaya email access links, accepting `email`/`p` and optional `minutes` from query params or JSON/form bodies. Generated links target `/kedaya/?p=...`.

### Cross-cutting details

- Link encryption/decryption is duplicated between browser code (`src/crypto.ts`) and Pages Functions (`functions/_shared/cards.js`, plus legacy `functions/api/link/generate.js`). Keep payload shape, duration fields, base64url encoding, and the AES-GCM password in sync when changing link format.
- `public/_headers` applies strict no-store, CSP, referrer, frame, and permissions headers to deployed assets. `public/_redirects` redirects legacy generator URLs to `/gen/`.
- `dist/`, `.wrangler/`, and `node_modules/` are generated/local directories and should not be edited as source.
