# Peoplegraph: Tag-Based Graph Filtering

## Goal
Transform the graph from "show all contacts" to "show contacts by tag filters." Graph starts empty — users toggle filters (Friends, Family, Work, etc.) to populate it. Tags can be manually assigned OR auto-suggested by the LLM when parsing notes.

---

## Phase 1: Data Model

### Update Contact type in `src/types/index.ts`

```typescript
export interface Contact {
  id: string;
  name: string;
  created_at: string;
  last_interaction: string;
  interaction_count: number;
  tags: string[];  // NEW: e.g. ["friends", "work"]
}
```

### Default tags (store in a constant, user can add custom later)

```typescript
export const DEFAULT_TAGS = ["friends", "family", "work"] as const;
export type DefaultTag = typeof DEFAULT_TAGS[number];
```

### Migration
- Existing contacts get `tags: []` (empty = untagged = hidden from graph by default)

---

## Phase 2: Tag Management UI

### Contact detail/edit view
- Show current tags as chips
- Click to toggle tags on/off
- Maybe: add custom tag input

### Bulk tagging (optional but nice)
- Select multiple contacts from list view
- "Apply tag" action

---

## Phase 3: Graph Filtering

### Filter UI on `/graph` page
- Row of toggle buttons/chips: `Friends | Family | Work | Untagged`
- All OFF by default → empty graph
- Toggle ON → contacts with that tag appear
- Multiple toggles = union (show Friends OR Work)

### Filter logic
```typescript
const activeFilters: string[] = ["friends", "work"]; // from UI state

const visibleContacts = contacts.filter(contact => 
  activeFilters.some(filter => 
    filter === "untagged" 
      ? contact.tags.length === 0 
      : contact.tags.includes(filter)
  )
);
```

### Graph renders only `visibleContacts`

---

## Phase 4: LLM Tag Suggestions (the magic)

### Update the parse API (`src/app/api/parse/route.ts`)

Current: LLM extracts contact name + notes
New: Also return `suggested_tags` based on note content

#### Updated prompt (add to existing):
```
Based on the context of this note, suggest which relationship categories might apply:
- "friends" — social, personal hangouts, non-work
- "family" — relatives, family events
- "work" — colleagues, professional context, office mentions

Return suggested_tags as an array. Only suggest if confident. Empty array if unclear.
```

#### Updated response schema:
```typescript
interface ParseResponse {
  contact_name: string;
  extracted_notes: string[];
  suggested_tags: string[];  // NEW
  confidence: number;
}
```

### Frontend handling

When user submits a note and gets `suggested_tags` back:

1. If contact exists and has no tags → show suggestion chips: "Add to Friends?" "Add to Work?"
2. User clicks to confirm (or dismisses)
3. If confirmed → update contact's tags in localStorage

**UX flow:**
```
User types: "Sarah — work happy hour, complaining about Q4"
           ↓
LLM returns: { contact_name: "Sarah", suggested_tags: ["work", "friends"] }
           ↓
UI shows: "Sarah" [matched] — Suggest adding: [Work ✓] [Friends ✓]
           ↓
User clicks Work → Sarah.tags now includes "work"
```

---

## Phase 5: Persistence

All changes go to localStorage under existing keys:
- `peoplegraph_contacts` — contacts with tags
- Tags are just strings in the contact object, no separate store needed

---

## Implementation Order

1. **Data model** — add `tags: string[]` to Contact type
2. **Migration util** — ensure existing contacts get `tags: []`
3. **Graph filter UI** — toggle buttons that filter displayed contacts
4. **Graph filter logic** — wire up filtering, empty by default
5. **Manual tag editing** — add/remove tags on contact detail
6. **LLM suggestion** — update parse prompt + response handling
7. **Suggestion UI** — show suggested tags after note submission, allow confirm

---

## Files to modify

- `src/types/index.ts` — Contact type, DEFAULT_TAGS
- `src/app/graph/page.tsx` — filter UI + filter logic
- `src/components/RelationshipGraph.tsx` — accept filtered contacts
- `src/app/api/parse/route.ts` — add tag suggestion to prompt
- `src/app/page.tsx` (or wherever note input lives) — handle suggested tags UI
- `src/lib/storage.ts` (if exists) — migration for existing contacts

---

## Decisions

1. **Untagged filter** — YES, include as a filter option for "tag these later" workflow
2. **Custom tags** — NO for v1, but architect for easy addition (tags are just strings, no hardcoded enum)
3. **Tag colors** — YES, colorblind-accessible palette:

```typescript
export const TAG_COLORS: Record<string, string> = {
  friends: "#9B7BB8",  // ube purple (Dom's fave)
  family: "#F59E0B",   // warm amber
  work: "#14B8A6",     // teal
  untagged: "#6B7280", // zinc gray
};

// For future custom tags, pull next available from this accessible palette
export const CUSTOM_TAG_PALETTE = [
  "#EC4899", // pink
  "#3B82F6", // blue
  "#10B981", // emerald
  "#EF4444", // red
  "#8B5CF6", // violet
] as const;
```

Graph nodes use these colors as fill with a subtle `rgba(255,255,255,0.2)` border for extra contrast against zinc-950 background.

**Colorblind rationale:** No red/green adjacency, distinct luminance values across all four, works in grayscale.
