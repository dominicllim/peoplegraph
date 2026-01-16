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
2. LLM extracts person name + facts + suggested tags (`/api/parse`)
3. Client-side fuzzy match against contacts
4. UI shows matching contacts as clickable chips
5. UI shows suggested relationship tags (friends/family/work) — user can toggle before saving
6. User clicks chip → note links to that contact with selected tags
7. Zero matches → "Create new contact" button highlighted

## Tagging system
Contacts have a `tags: string[]` field for relationship categories.

**Default tags:** `friends`, `family`, `work`
- Defined in `src/types/index.ts` as `DEFAULT_TAGS`
- Each has a color in `TAG_COLORS` (ube purple, amber, teal)
- `untagged` is a filter state (gray), not an assignable tag

**Tag colors (colorblind-accessible):**
- friends: #9B7BB8 (ube purple)
- family: #F59E0B (amber)
- work: #14B8A6 (teal)
- untagged: #6B7280 (zinc gray)

**LLM tag suggestions:**
- Parse API returns `suggested_tags` based on note context
- UI pre-selects suggested tags, user can toggle before saving
- Suggested tags show ✨ sparkle indicator

**Graph filtering:**
- `/graph` page has filter toggles for each tag + untagged
- All filters OFF by default → empty graph
- Multiple filters = union (shows contacts matching ANY selected filter)
- Nodes colored by first tag

## Key files
- `src/app/api/parse/route.ts` — LLM extracts name + notes + suggested_tags
- `src/lib/storage.ts` — localStorage helpers with migration for tags
- `src/lib/vcard.ts` — vCard parser for bulk contact import
- `src/components/RelationshipGraph.tsx` — force graph component (accepts filtered contacts)
- `src/types/index.ts` — Contact, Note, DEFAULT_TAGS, TAG_COLORS, getTagColor

## Gotchas
- Tailwind v4 uses `@import "tailwindcss"` not the old `@tailwind` directives
- `react-force-graph-2d` needs dynamic import with `ssr: false` (uses window)
- vCard import: parses FN field (formatted name), falls back to N field
- Fuzzy matching: exact > starts with > contains > first name match
- Migration: `getContacts()` auto-migrates old contacts to include `tags: []`

## Conventions
- Dark theme: zinc-950 background, zinc-900 panels
- localStorage keys: `peoplegraph_contacts`, `peoplegraph_notes`
- Git commits: lowercase imperative, co-authored by `machine angel <machine@angel>`
