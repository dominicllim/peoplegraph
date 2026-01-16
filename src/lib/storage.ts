import { Contact } from "@/types";

const CONTACTS_KEY = "peoplegraph_contacts";

/**
 * Migrates existing contacts to include tags field.
 * Contacts without tags get an empty array.
 * Safe to run multiple times (idempotent).
 */
export function migrateContactsWithTags(): void {
  if (typeof window === "undefined") return;

  const raw = localStorage.getItem(CONTACTS_KEY);
  if (!raw) return;

  try {
    const contacts = JSON.parse(raw) as Record<string, unknown>[];
    let migrated = false;

    const updated = contacts.map((contact) => {
      if (!Array.isArray(contact.tags)) {
        migrated = true;
        return { ...contact, tags: [] };
      }
      return contact;
    });

    if (migrated) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
      console.log("[peoplegraph] Migrated " + updated.length + " contacts to include tags");
    }
  } catch (e) {
    console.error("[peoplegraph] Failed to migrate contacts:", e);
  }
}

/**
 * Get all contacts from localStorage (with migration applied)
 */
export function getContacts(): Contact[] {
  if (typeof window === "undefined") return [];

  migrateContactsWithTags();

  const raw = localStorage.getItem(CONTACTS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Contact[];
  } catch (e) {
    console.error("[peoplegraph] Failed to parse contacts:", e);
    return [];
  }
}

/**
 * Save contacts to localStorage
 */
export function saveContacts(contacts: Contact[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}
