'use client';

import { useState, useEffect, useRef } from 'react';
import { Contact, Note } from '@/types';

// Local storage helpers (we'll swap for Supabase later)
const CONTACTS_KEY = 'peoplegraph_contacts';
const NOTES_KEY = 'peoplegraph_notes';

function getStoredContacts(): Contact[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(CONTACTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function getStoredNotes(): Note[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(NOTES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveContacts(contacts: Contact[]) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export default function Home() {
  const [input, setInput] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ contact: string; notes: string[] } | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContacts(getStoredContacts());
    setNotes(getStoredNotes());
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Sort contacts by recency for better matching
      const sortedContacts = [...contacts].sort(
        (a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime()
      );

      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input, 
          existingContacts: sortedContacts 
        }),
      });

      if (!response.ok) throw new Error('Parse failed');
      
      const parsed = await response.json();
      const now = new Date().toISOString();
      
      let contact: Contact;
      
      if (parsed.is_new_contact) {
        // Create new contact
        contact = {
          id: crypto.randomUUID(),
          name: parsed.contact_name,
          created_at: now,
          last_interaction: now,
          interaction_count: 1,
        };
        const newContacts = [contact, ...contacts];
        setContacts(newContacts);
        saveContacts(newContacts);
      } else {
        // Find and update existing contact
        const existing = contacts.find(
          c => c.name.toLowerCase() === parsed.contact_name.toLowerCase()
        );
        
        if (existing) {
          contact = {
            ...existing,
            last_interaction: now,
            interaction_count: existing.interaction_count + 1,
          };
          const newContacts = contacts.map(c => c.id === contact.id ? contact : c);
          setContacts(newContacts);
          saveContacts(newContacts);
        } else {
          // Fallback: create as new
          contact = {
            id: crypto.randomUUID(),
            name: parsed.contact_name,
            created_at: now,
            last_interaction: now,
            interaction_count: 1,
          };
          const newContacts = [contact, ...contacts];
          setContacts(newContacts);
          saveContacts(newContacts);
        }
      }

      // Create note
      const note: Note = {
        id: crypto.randomUUID(),
        contact_id: contact.id,
        content: parsed.extracted_notes.join('\n'),
        raw_input: input,
        created_at: now,
        tags: parsed.tags,
      };
      
      const newNotes = [note, ...notes];
      setNotes(newNotes);
      saveNotes(newNotes);
      
      setLastSaved({ contact: contact.name, notes: parsed.extracted_notes });
      setInput('');
      
      // Clear success message after 3s
      setTimeout(() => setLastSaved(null), 3000);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save note. Check console.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  const getNotesForContact = (contactId: string) => {
    return notes.filter(n => n.contact_id === contactId);
  };

  const sortedContacts = [...contacts].sort(
    (a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime()
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-100">peoplegraph</h1>
          <p className="text-zinc-500 text-sm">capture → match → store</p>
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
              <p className="text-zinc-500 text-sm mb-6">
                {selectedContact.interaction_count} interactions · Last: {new Date(selectedContact.last_interaction).toLocaleDateString()}
              </p>
              
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
            <h2 className="text-zinc-500 text-sm mb-3">Contacts ({contacts.length})</h2>
            {sortedContacts.length === 0 ? (
              <p className="text-zinc-600">No contacts yet. Add your first note above.</p>
            ) : (
              <div className="space-y-2">
                {sortedContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{contact.name}</span>
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
