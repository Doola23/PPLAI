// Manual image corrections — NOT touched when extraPlayerImages.ts is regenerated.
//
//  • overrides : force a specific correct image URL for a player (wins over every
//                auto-resolved source). Use when the auto photo is the wrong person.
//  • blocklist : force the initials avatar (use when the only available photo is
//                wrong, outdated, or low-quality and there's no good replacement).
//
// Keys are lowercase; accents are matched flexibly and a bare surname also works.

export const imageOverrides: Record<string, string> = {
  // Jáder Durán (Aston Villa) collided with the "duran" surname key, which resolves to
  // Pablo Durán (Celta Vigo). Pin him to his own FotMob id.
  'jader duran': 'https://images.fotmob.com/image_resources/playerimages/1088066.png',
};

export const imageBlocklist: string[] = [
  // 'example player', // force initials when the auto photo is wrong/poor
];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export interface ImageOverride { url?: string; blocked?: boolean; }

export function getImageOverride(name: string): ImageOverride | null {
  if (!name) return null;
  const keyA = stripAccents(name.toLowerCase().trim());
  const surname = keyA.split(' ').filter(Boolean).pop() || '';

  const matches = (entry: string) => {
    const e = stripAccents(entry.toLowerCase().trim());
    return e === keyA || (e.length > 2 && e === surname);
  };

  for (const [k, v] of Object.entries(imageOverrides)) {
    if (matches(k)) return { url: v };
  }
  if (imageBlocklist.some(matches)) return { blocked: true };
  return null;
}
