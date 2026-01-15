# peoplegraph

Personal CRM with zero-friction note capture. Type a brain dump, it gets matched to the right contact and stored with structured notes.

## The Loop

```
Input: "Sarah — talked about her new job at Stripe, she's nervous about the learning curve, Japan trip in April"

Output: 
  → Matched to: Sarah [existing contact]
  → Stored:
    - New job at Stripe (career)
    - Nervous about learning curve (emotional context)  
    - Japan trip April (plans)
    - Timestamped: Jan 14, 2025
```

## Setup

```bash
# Install deps
npm install

# Copy env and add your Anthropic API key
cp .env.example .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## v0 Features

- ✅ Fast text capture
- ✅ LLM-powered contact matching (recency/frequency heuristic)
- ✅ Auto-extraction of notes + tags
- ✅ Timestamped entries
- ✅ Contact list with history view
- ✅ LocalStorage persistence

## Next Up

- [ ] Supabase backend (sync across devices)
- [ ] Disambiguation UI for multiple matches
- [ ] Voice input
- [ ] Calendar integration (reminder before meetings)
- [ ] Contacts import
- [ ] Social/LinkedIn enrichment

## Tech Stack

- Next.js 15 (App Router)
- Tailwind CSS
- Anthropic Claude API
- LocalStorage (Supabase ready)
