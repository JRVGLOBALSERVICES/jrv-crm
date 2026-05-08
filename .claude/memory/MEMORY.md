# Lead CRM (Original) — Project Memory

**Original source for the Lead CRM system. Deployed version at `/lead-crm-vercel/`.**

## Contents

| File | Purpose |
|------|---------|
| `src/` | Next.js source (pre-deployment) |
| `scripts/` | DB migration, seed, check scripts |
| `data/leads.json` | Seed data / backup |
| `server.js` | Express fallback server |
| `minimal-server.js` | Minimal Express server |
| `crm-server.py` | Python CRM server |
| `public/` | HTML prototypes (dashboard, lead detail, new lead form) |
| `supabase/migrations.sql` | DB schema (leads table) |

## Notes
- The deployed app at lead-crm-vercel has the same source but is the live version
- Env vars needed: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- Deployed URL: https://lead-crm-wine.vercel.app
