import api from '../../../services/api';
import type { PlayerExtras, ScoutingPrimary } from './types';

const LS_PRIMARY = 'scoutlab_primary_v4';
const CACHE_TTL = 6 * 60 * 60 * 1000;

// Module-level promise cache — survives SPA navigation, no JSON.parse on return visits
let primaryPromise: Promise<ScoutingPrimary> | null = null;

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function lsSet(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch { /* quota or private mode */ }
}

export function fetchPrimary(): Promise<ScoutingPrimary> {
  if (!primaryPromise) {
    const cached = lsGet<ScoutingPrimary>(LS_PRIMARY);
    primaryPromise = cached
      ? Promise.resolve(cached)
      : api.get<ScoutingPrimary>('/api/scouting/primary')
        .then(r => { lsSet(LS_PRIMARY, r.data); return r.data; })
        .catch(e => { primaryPromise = null; throw e; });
  }
  return primaryPromise;
}

// Shot map, match log and similar players for one player, fetched when their report opens.
export const EMPTY_EXTRAS: PlayerExtras = { shots: null, logs: null, similar: [] };

const playerExtrasCache = new Map<string, Promise<PlayerExtras>>();

export function fetchPlayerExtras(key: string): Promise<PlayerExtras> {
  let pending = playerExtrasCache.get(key);
  if (!pending) {
    const name = encodeURIComponent(key);
    pending = Promise.all([
      api.get(`/api/scouting/shot-maps/${name}`),
      api.get(`/api/scouting/match-logs/${name}`),
      api.get(`/api/scouting/similar/${name}`),
    ]).then(([sm, ml, sim]) => ({
      shots: sm.data?.items?.[0]?.shots ?? null,
      logs: ml.data?.items?.[0]?.logs?.m ?? null,
      similar: sim.data?.items ?? [],
    })).catch(() => { playerExtrasCache.delete(key); return EMPTY_EXTRAS; });
    playerExtrasCache.set(key, pending);
  }
  return pending;
}

// Called from Sidebar on mount — fires the request before user clicks scout search
export function prewarmScouting(): void {
  fetchPrimary().catch(() => {});
}
