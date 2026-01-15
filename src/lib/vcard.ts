// Parse vCard (.vcf) file content into array of contact names

export function parseVCard(content: string): string[] {
  const names: string[] = [];

  // Split into individual vCards
  const cards = content.split(/BEGIN:VCARD/i).slice(1);

  for (const card of cards) {
    // Look for FN (formatted name) field - this is the display name
    const fnMatch = card.match(/^FN[;:](.+)$/im);
    if (fnMatch) {
      const name = fnMatch[1].trim();
      if (name) {
        names.push(name);
      }
      continue;
    }

    // Fallback: try N field (structured name: last;first;middle;prefix;suffix)
    const nMatch = card.match(/^N[;:]([^;]*);([^;]*)/im);
    if (nMatch) {
      const lastName = nMatch[1].trim();
      const firstName = nMatch[2].trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      if (fullName) {
        names.push(fullName);
      }
    }
  }

  return names;
}
