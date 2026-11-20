// The player-image maps are ~500KB of source, so they load as their own chunk
// instead of riding along with every page that renders an avatar.
export interface PlayerImageIndex {
  extra: (name: string) => string | undefined;
  fpl: (name: string) => string | undefined;
  fplAsync: (name: string) => Promise<string | undefined>;
}

let index: PlayerImageIndex | null = null;
let pending: Promise<PlayerImageIndex> | null = null;

export function getPlayerImageIndex(): PlayerImageIndex | null {
  return index;
}

export function loadPlayerImageIndex(): Promise<PlayerImageIndex> {
  pending ??= Promise.all([import('./extraPlayerImages'), import('./playerImages')])
    .then(([extra, fpl]) => {
      index = { extra: extra.getExtraPlayerImage, fpl: fpl.getPlayerImage, fplAsync: fpl.getPlayerImageAsync };
      return index;
    })
    .catch((err) => { pending = null; throw err; });
  return pending;
}
