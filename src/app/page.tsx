'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Contact, Note, ContactMatch, DEFAULT_TAGS, getTagColor } from '@/types';
import { parseVCard } from '@/lib/vcard';
import { getContacts, saveContacts } from '@/lib/storage';

const NOTES_KEY = 'peoplegraph_notes';

function getStoredNotes(): Note[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(NOTES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

// Fuzzy match contact names
function fuzzyMatch(name: string, contacts: Contact[]): ContactMatch[] {
  const query = name.toLowerCase();
  const matches: ContactMatch[] = [];

  for (const contact of contacts) {
    const contactName = contact.name.toLowerCase();
    let score = 0;

    if (contactName === query) score = 1.0;
    else if (contactName.startsWith(query)) score = 0.8;
    else if (query.startsWith(contactName)) score = 0.7;
    else if (contactName.includes(query) || query.includes(contactName)) score = 0.5;
    else {
      // Check first name match
      const contactFirst = contactName.split(' ')[0];
      const queryFirst = query.split(' ')[0];
      if (contactFirst === queryFirst) score = 0.6;
    }

    if (score > 0) matches.push({ contact, score });
  }

  return matches.sort((a, b) => b.score - a.score);
}

export default function Home() {
  const [input, setInput] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ contact: string; notes: string[] } | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [pendingNote, setPendingNote] = useState<{
    extractedName: string;
    notes: string[];
    tags?: string[];
    suggestedTags?: string[];
    rawInput: string;
    matches: ContactMatch[];
  } | null>(null);
  const [selectedSuggestedTags, setSelectedSuggestedTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContacts(getContacts());
    setNotes(getStoredNotes());
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) throw new Error('Parse failed');

      const parsed = await response.json();

      // Fuzzy match against existing contacts
      const matches = fuzzyMatch(parsed.extracted_name, contacts);
      const suggestedTags = parsed.suggested_tags || [];

      // Pre-select suggested tags
      setSelectedSuggestedTags(suggestedTags);

      // Show matching UI
      setPendingNote({
        extractedName: parsed.extracted_name,
        notes: parsed.extracted_notes,
        tags: parsed.tags,
        suggestedTags,
        rawInput: input,
        matches,
      });

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to parse note. Check console.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save note to selected contact
  const saveToContact = (contact: Contact, isNew: boolean) => {
    if (!pendingNote) return;

    const now = new Date().toISOString();
    // Merge selected suggested tags with existing contact tags (dedupe)
    const mergedTags = [...new Set([...contact.tags, ...selectedSuggestedTags])];
    let updatedContact: Contact;

    if (isNew) {
      updatedContact = { ...contact, tags: mergedTags };
      const newContacts = [updatedContact, ...contacts];
      setContacts(newContacts);
      saveContacts(newContacts);
    } else {
      updatedContact = {
        ...contact,
        tags: mergedTags,
        last_interaction: now,
        interaction_count: contact.interaction_count + 1,
      };
      const newContacts = contacts.map(c => c.id === contact.id ? updatedContact : c);
      setContacts(newContacts);
      saveContacts(newContacts);
    }

    const note: Note = {
      id: crypto.randomUUID(),
      contact_id: updatedContact.id,
      content: pendingNote.notes.join('\n'),
      raw_input: pendingNote.rawInput,
      created_at: now,
      tags: pendingNote.tags,
    };

    const newNotes = [note, ...notes];
    setNotes(newNotes);
    saveNotes(newNotes);

    setLastSaved({ contact: updatedContact.name, notes: pendingNote.notes });
    setInput('');
    setPendingNote(null);
    setSelectedSuggestedTags([]);

    setTimeout(() => setLastSaved(null), 3000);
  };

  // Create new contact and save note
  const createNewContact = () => {
    if (!pendingNote) return;

    const now = new Date().toISOString();
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name: pendingNote.extractedName,
      created_at: now,
      last_interaction: now,
      interaction_count: 1,
      tags: [], // Will be merged with selectedSuggestedTags in saveToContact
    };

    saveToContact(newContact, true);
  };

  // Toggle a suggested tag selection
  const toggleSuggestedTag = (tag: string) => {
    setSelectedSuggestedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Handle vCard import
  const handleVCardImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const names = parseVCard(content);

      const now = new Date().toISOString();
      const newContacts: Contact[] = names
        .filter(name => !contacts.some(c => c.name.toLowerCase() === name.toLowerCase()))
        .map(name => ({
          id: crypto.randomUUID(),
          name,
          created_at: now,
          last_interaction: now,
          interaction_count: 0,
          tags: [],
        }));

      if (newContacts.length > 0) {
        const allContacts = [...newContacts, ...contacts];
        setContacts(allContacts);
        saveContacts(allContacts);
        alert(`Imported ${newContacts.length} new contacts`);
      } else {
        alert('No new contacts to import');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  const getNotesForContact = (contactId: string) => {
    return notes.filter(n => n.contact_id === contactId);
  };

  // Toggle tag on a contact
  const toggleTag = (contact: Contact, tag: string) => {
    const hasTag = contact.tags.includes(tag);
    const newTags = hasTag
      ? contact.tags.filter(t => t !== tag)
      : [...contact.tags, tag];

    const updatedContact = { ...contact, tags: newTags };
    const newContacts = contacts.map(c => c.id === contact.id ? updatedContact : c);

    setContacts(newContacts);
    saveContacts(newContacts);
    setSelectedContact(updatedContact);
  };

  const sortedContacts = [...contacts].sort(
    (a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime()
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">peoplegraph</h1>
            <p className="text-zinc-500 text-sm">capture → match → store</p>
          </div>
          <Link href="/graph" className="text-zinc-500 hover:text-zinc-300 text-sm">
            Graph →
          </Link>
        </div>

        {/* Capture Input */}
        <div className="mb-8">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sarah — talked about her new job at Stripe, nervous about learning curve, Japan trip in April..."
            className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            disabled={isProcessing}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-zinc-600 text-sm">⌘ + Enter to save</span>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !input.trim()}
              className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {lastSaved && (
          <div className="mb-6 p-4 bg-emerald-950 border border-emerald-800 rounded-lg">
            <p className="text-emerald-400 text-sm font-medium">Saved to {lastSaved.contact}</p>
            <ul className="mt-2 text-emerald-300 text-sm">
              {lastSaved.notes.map((note, i) => (
                <li key={i}>• {note}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Matching UI */}
        {pendingNote && (
          <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
            <p className="text-zinc-400 text-sm mb-3">Extracted from note:</p>
            <ul className="mb-4 text-zinc-200 text-sm">
              {pendingNote.notes.map((note, i) => (
                <li key={i}>• {note}</li>
              ))}
            </ul>

            {/* Tag suggestions */}
            {pendingNote.suggestedTags && pendingNote.suggestedTags.length > 0 && (
              <div className="mb-4">
                <p className="text-zinc-400 text-sm mb-2">Add tags:</p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TAGS.map((tag) => {
                    const isSuggested = pendingNote.suggestedTags?.includes(tag);
                    const isSelected = selectedSuggestedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleSuggestedTag(tag)}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                        style={{
                          backgroundColor: isSelected ? getTagColor(tag) : 'transparent',
                          color: isSelected ? '#fff' : getTagColor(tag),
                          border: `2px solid ${getTagColor(tag)}`,
                          opacity: isSuggested || isSelected ? 1 : 0.5,
                        }}
                      >
                        {tag} {isSuggested && !isSelected && '✨'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-zinc-400 text-sm mb-2">
              {pendingNote.matches.length === 0 ? 'No matches found. Create new contact?' : 'Link to contact:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingNote.matches.map(({ contact }) => (
                <button
                  key={contact.id}
                  onClick={() => saveToContact(contact, false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-zinc-100 transition-colors"
                >
                  {contact.name}
                </button>
              ))}
              <button
                onClick={createNewContact}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  pendingNote.matches.length === 0
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-blue-900 hover:bg-blue-800 text-blue-100'
                }`}
              >
                + {pendingNote.extractedName}
              </button>
            </div>

            <button
              onClick={() => {
                setPendingNote(null);
                setSelectedSuggestedTags([]);
              }}
              className="mt-4 text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Contact List / Detail View */}
        {selectedContact ? (
          <div>
            <button
              onClick={() => setSelectedContact(null)}
              className="text-zinc-500 hover:text-zinc-300 mb-4 text-sm"
            >
              ← Back
            </button>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-1">{selectedContact.name}</h2>
              <p className="text-zinc-500 text-sm mb-4">
                {selectedContact.interaction_count} interactions · Last: {new Date(selectedContact.last_interaction).toLocaleDateString()}
              </p>

              {/* Tag toggles */}
              <div className="flex flex-wrap gap-2 mb-6">
                {DEFAULT_TAGS.map((tag) => {
                  const isActive = selectedContact.tags?.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(selectedContact, tag)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isActive ? getTagColor(tag) : 'transparent',
                        color: isActive ? '#fff' : getTagColor(tag),
                        border: `2px solid ${getTagColor(tag)}`,
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                {getNotesForContact(selectedContact.id).map((note) => (
                  <div key={note.id} className="border-l-2 border-zinc-700 pl-4">
                    <p className="text-zinc-400 text-xs mb-2">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-zinc-200 whitespace-pre-wrap">{note.content}</p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {note.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-zinc-500 text-sm">Contacts ({contacts.length})</h2>
              <label className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer">
                Import vCard
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf"
                  onChange={handleVCardImport}
                  className="hidden"
                />
              </label>
            </div>
            {sortedContacts.length === 0 ? (
              <p className="text-zinc-600">No contacts yet. Import a vCard or add your first note above.</p>
            ) : (
              <div className="space-y-2">
                {sortedContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contact.name}</span>
                        {contact.tags?.length > 0 && (
                          <div className="flex gap-1">
                            {contact.tags.map((tag) => (
                              <span
                                key={tag}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getTagColor(tag) }}
                                title={tag}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-zinc-500 text-sm">
                        {contact.interaction_count} notes
                      </span>
                    </div>
                    <p className="text-zinc-500 text-sm mt-1">
                      Last: {new Date(contact.last_interaction).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
