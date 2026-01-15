'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { Contact, Note } from '@/types';

const RelationshipGraph = dynamic(
    () => import('@/components/RelationshipGraph'),
    { ssr: false }
);

const NOTES_KEY = 'peoplegraph_notes';

export default function GraphPage() {
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [allNotes, setAllNotes] = useState<Note[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(NOTES_KEY);
            return stored ? JSON.parse(stored) : [];
        }
        return [];
    });

    const contactNotes = selectedContact
        ? allNotes.filter(n => n.contact_id === selectedContact.id)
        : [];

    return (
        <div className="min-h-screen bg-zinc-950 p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">your people</h1>
                <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">
                    ← Capture
                </Link>
            </div>
            
            <div className="flex gap-8">
                <div className="flex-1 h-[600px]">
                    <RelationshipGraph onNodeClick={(contact) => setSelectedContact(contact)} />
                </div>

                <div className="w-80 bg-zinc-900 p-6 rounded-lg h-fit">
                    {selectedContact ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">{selectedContact.name}</h2>
                                <button
                                    onClick={() => setSelectedContact(null)}
                                    className="text-zinc-500 hover:text-white text-xl"
                                >
                                    ×
                                </button>
                            </div>
                            
                            <p className="text-zinc-500 text-sm mb-4">
                                {selectedContact.interaction_count} notes · Last: {new Date(selectedContact.last_interaction).toLocaleDateString()}
                            </p>

                            <div className="space-y-4">
                                {contactNotes.map((note) => (
                                    <div key={note.id} className="bg-zinc-800 p-4 rounded-lg">
                                        <ul className="list-disc list-inside space-y-1">
                                            {note.content.split('\n').map((line, i) => (
                                                <li key={i} className="text-zinc-300 text-sm">{line}</li>
                                            ))}
                                        </ul>
                                        <p className="text-zinc-600 text-xs mt-3">
                                            {new Date(note.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-zinc-500">Click a contact</p>
                    )}
                </div>
            </div>
        </div>
    );
}