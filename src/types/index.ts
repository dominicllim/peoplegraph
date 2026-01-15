export interface Contact {
  id: string;
  name: string;
  created_at: string;
  last_interaction: string;
  interaction_count: number;
}

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
