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

## Note capture flow
1. User types brain dump → clicks Save
2. LLM extracts person name + facts (`/api/parse`)
3. Client-side fuzzy match against contacts
4. UI shows matching contacts as clickable chips
5. User clicks chip → note links to that contact
6. Zero matches → "Create new contact" button highlighted

## Key files
- `src/app/api/parse/route.ts` — LLM extracts name + notes (no matching)
- `src/lib/vcard.ts` — vCard parser for bulk contact import
- `src/components/RelationshipGraph.tsx` — D3 force graph component
- `src/types/index.ts` — Contact, Note, ContactMatch types

## Gotchas
- Tailwind v4 uses `@import "tailwindcss"` not the old `@tailwind` directives
- `react-force-graph-2d` needs dynamic import with `ssr: false` (uses window)
- vCard import: parses FN field (formatted name), falls back to N field
- Fuzzy matching: exact > starts with > contains > first name match

## Conventions
- Dark theme: zinc-950 background, zinc-900 panels
- localStorage keys: `peoplegraph_contacts`, `peoplegraph_notes`
