## Purpose

This file gives coding agents the essential, actionable knowledge to be productive immediately in this repository: how the app is structured, the developer workflows (run/build/debug), important environment variables, and project-specific conventions to follow.

**Quick Commands**
- **Full dev (API + client on one port):** `npm run dev:server` — starts the Express server which mounts Vite as middleware on `PORT` (defaults to `5000`). This is the recommended way to run the complete app locally.
- **Client-only dev:** `npm run dev` — starts the Vite dev server (client only).
- **Build / Preview:** `npm run build` then `npm run preview` (Vite). For server-based production flow build the client `npm run build` and run your server with appropriate env vars.
- **Drizzle (migrations):** `npm run db:push`, `npm run db:generate`, `npm run db:studio` (see `drizzle/` folder).
- **Verify envs (quick):** `node check-vercel-env.js` — prints whether critical env vars are set.

**Big-picture architecture**
- **Client:** React (Vite + TypeScript) under `src/` — pages/routes in `src/pages`, UI in `src/components`, business logic in `src/services`.
- **Server:** Express-based code lives in `server/`. `server/index.ts` wires middleware and (in dev) integrates Vite via `createViteServer()` so a single process can serve both API and client.
- **Storage / DB / Auth:** Supabase is used for auth, storage and Postgres (see `src/integrations/supabase/client.ts`).
- **AI:** Google Gemini is used for video analysis. Client-side services call Gemini via `src/services/geminiAnalysisService.ts` and server-side helpers are in `server/gemini-video-analysis.ts`.

**Critical environment variables & gotchas**
- Client-exposed Vite vars (must start with `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY` — used by code under `src/` via `import.meta.env`.
- Server runtime vars: `GEMINI_API_KEY` is read by `server/gemini-video-analysis.ts` (process.env). When deploying, make sure both the client and server keys are configured if the server expects the non-prefixed name.
- Service role / admin: `SUPABASE_SERVICE_ROLE_KEY` — required by maintenance scripts (e.g. `disable-rls-motion-analysis.js`) — do NOT commit this to source control.
- Vite only exposes `VITE_` prefixed variables at build time — on Vercel/Netlify you must add them in the dashboard and redeploy.

**Where to look for examples / patterns**
- API entry & dev integration: `server/index.ts`
- Gemini analysis implementation: `server/gemini-video-analysis.ts` and `src/services/geminiAnalysisService.ts`
- Supabase client: `src/integrations/supabase/client.ts`
- Vite env/define bindings and aliases: `vite.config.ts` (note `@` and `@shared` aliases)
- DB migrations and seeds: `drizzle/` directory and `drizzle.config.ts`

**Project-specific conventions**
- Organization: `src/integrations/*` for external clients, `src/services/*` for business logic, `src/pages/*` for route pages.
- Use `import.meta.env.VITE_*` in client code. Server code uses `process.env.*`.
- Keep long-running or heavy compute in `server/` (video processing, reading files, large base64 payloads). Client should send video URLs (Supabase storage) rather than embedding huge payloads when possible.
- RLS/storage fixes and debugging helpers are tracked as scripts in the repo (`disable-rls-motion-analysis.js`, `verify-storage-policies.js`) — run them with proper service-role credentials only.

**Common troubleshooting checks (first things to try)**
- If client shows blank page: check `import.meta.env.VITE_SUPABASE_URL` in browser console and ensure Vercel/Netlify envs are set and the project was redeployed.
- If Gemini errors: confirm `VITE_GEMINI_API_KEY` (for client) and `GEMINI_API_KEY` (for server) exist and are valid.
- To confirm environment variables available to the build: run `node check-vercel-env.js` locally or inspect Vercel build logs after deploy.
- Upload limits: client expects video files < ~100MB (see `ARCHITECTURE.md` / `QUICK_START.md`).

**Small checklist for contributors/agents**
- Install: `npm i` at repo root.
- Start the full app: `npm run dev:server` (recommended) or run client + server separately.
- When changing env var names, update `vite.config.ts` if the variable must be available to the client.
- If modifying DB schema, add/verify migrations in `drizzle/` and run `npm run db:push`.

**References**
- `package.json` — scripts and dependency list
- `vite.config.ts` — env exposure and aliases
- `server/index.ts`, `server/gemini-video-analysis.ts` — server + Gemini usage
- `src/integrations/supabase/client.ts`, `src/services/*` — integration and service patterns
- `ARCHITECTURE.md`, `QUICK_START.md`, `VERCEL_ENV_SETUP.md` — operational notes and deployment gotchas

Please review this guidance and tell me which sections need more detail or examples (e.g., step-by-step debug for a failing upload, or a sample `.env.local` for local dev).
