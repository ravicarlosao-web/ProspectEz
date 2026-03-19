# ProspectEz — Replit Environment

## Overview
ProspectEz is a lead prospecting and CRM platform built for Angolan agencies. It helps teams find clients, manage leads through a sales funnel, send message templates, and track payments.

## Architecture
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/Auth/DB**: Supabase (external hosted) — auth, Postgres database, edge functions, realtime, storage
- **No custom backend server** — all data access goes through the Supabase client (anon key + RLS policies)

## Key Features
- Landing page (`/`)
- Auth: login, register, password recovery/reset
- Dashboard, Clients (leads CRM), Messages (templates), Prospection (Firecrawl web search/scrape), Finance (payments), Settings
- Admin panel with: user management, plans, audit logs, security logs, Firecrawl config, finance approval

## Running the App
```bash
npm run dev
```
Runs on port 5000. The "Start application" workflow handles this automatically.

## Environment Variables
Set in Replit's environment (not `.env` — already configured):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (public, safe to expose)
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID

## Supabase Edge Functions
Located in `supabase/functions/`. These run on Supabase's infrastructure (not Replit):
- `check-device` — Anti-abuse fingerprinting & rate limiting
- `cleanup-receipts` — Cron job to remove old payment receipts from storage
- `firecrawl-scrape` — Proxy to Firecrawl scrape API (requires `FIRECRAWL_API_KEY` in Supabase secrets)
- `firecrawl-search` — Proxy to Firecrawl search API
- `log-security-event` — Write security events to `security_logs` table

## Database Schema (Supabase Postgres)
Key tables: `profiles`, `user_roles`, `leads`, `messages`, `message_templates`, `prospection_logs`, `search_quotas`, `app_settings`, `payments`, `admin_audit_log`, `security_logs`, `device_registrations`, `registration_attempts`

All tables have Row Level Security (RLS) enabled. Roles: `admin`, `gestor`, `vendedor`.

## Deployment
For production deployment on Replit, build with `npm run build` and serve the `dist/` folder.
