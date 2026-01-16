export interface Contact {
  id: string;
  name: string;
  created_at: string;
  last_interaction: string;
  interaction_count: number;
  tags: string[];
}

// Default tag categories
export const DEFAULT_TAGS = ["friends", "family", "work"] as const;
export type DefaultTag = (typeof DEFAULT_TAGS)[number];

// Tag colors - colorblind-accessible palette
// Note: "untagged" is a filter state, not an assignable tag
export const TAG_COLORS: Record<string, string> = {
  friends: "#9B7BB8", // ube purple
  family: "#F59E0B", // warm amber
  work: "#14B8A6", // teal
  untagged: "#6B7280", // zinc gray
};

// For future custom tags
export const CUSTOM_TAG_PALETTE = [
  "#EC4899", // pink
  "#3B82F6", // blue
  "#10B981", // emerald
  "#EF4444", // red
  "#8B5CF6", // violet
] as const;

// Helper to get tag color with fallback
export const getTagColor = (tag: string): string =>
  TAG_COLORS[tag] ?? TAG_COLORS.untagged;

export interface Note {
  id: string;
  contact_id: string;
  content: string;
  raw_input: string;
  created_at: string;
  tags?: string[];
}

export interface ParsedNote {
  contact_name: string;
  extracted_notes: string[];
  tags?: string[];
  confidence: number;
}

// New types for contact matching flow
export interface ParsedNoteResult {
  extracted_name: string;
  extracted_notes: string[];
  tags?: string[];
}

export interface ContactMatch {
  contact: Contact;
  score: number; // 0-1 match quality
}
