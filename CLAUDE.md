# peoplegraph

Personal CRM with zero-friction note capture. "Wikipedia for your friends."

## Stack
- Next.js 15 (App Router)
- Tailwind CSS v4
- Anthropic Claude API (note parsing)
- localStorage (Supabase-ready)
- react-force-graph-2d (network visualization)

## Run locally
```bash
npm install
npm run dev
```
Runs at http://localhost:3000

## Structure
- `/` — main capture page (text input → parsed notes)
- `/graph` — force-directed relationship visualization

## Key files
- `src/app/api/parse/route.ts` — LLM endpoint for contact matching + note extraction
- `src/components/RelationshipGraph.tsx` — D3 force graph component
- `src/types/index.ts` — Contact, Note, ParsedNote types

## Gotchas
- Tailwind v4 uses `@import "tailwindcss"` not the old `@tailwind` directives
- `react-force-graph-2d` needs dynamic import with `ssr: false` (uses window)
- Keep dev server running in one terminal tab, commands in another

## Conventions
- Dark theme: zinc-950 background, zinc-900 panels
- localStorage keys: `peoplegraph_contacts`, `peoplegraph_notes`
