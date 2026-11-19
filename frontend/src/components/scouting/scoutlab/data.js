import api from "../../../services/api";

// Module-level promise cache — survives SPA navigation, no JSON.parse on return visits
export let _primaryPromise = null;

export const LS_PRIMARY = 'scoutlab_primary_v4';

export const CACHE_TTL  = 6 * 60 * 60 * 1000; // 6 hours

export function lsGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

export function lsSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

export function fetchPrimary() {
  if (!_primaryPromise) {
    const cached = lsGet(LS_PRIMARY);
    if (cached) {
      _primaryPromise = Promise.resolve(cached);
    } else {
      _primaryPromise = api.get('/api/scouting/primary')
        .then(r => { lsSet(LS_PRIMARY, r.data); return r.data; })
        .catch(e => { _primaryPromise = null; throw e; });
    }
  }
  return _primaryPromise;
}

// Shot map, match log and similar players for one player, fetched when their report opens.
export const EMPTY_EXTRAS = { shots: null, logs: null, similar: [] };

export const _playerExtrasCache = new Map();

export function fetchPlayerExtras(key) {
  if (!_playerExtrasCache.has(key)) {
    const name = encodeURIComponent(key);
    _playerExtrasCache.set(key, Promise.all([
      api.get(`/api/scouting/shot-maps/${name}`),
      api.get(`/api/scouting/match-logs/${name}`),
      api.get(`/api/scouting/similar/${name}`),
    ]).then(([sm, ml, sim]) => ({
      shots: sm.data?.items?.[0]?.shots ?? null,
      logs: ml.data?.items?.[0]?.logs?.m ?? null,
      similar: sim.data?.items ?? [],
    })).catch(() => { _playerExtrasCache.delete(key); return EMPTY_EXTRAS; }));
  }
  return _playerExtrasCache.get(key);
}

// Called from Sidebar on mount — fires the request before user clicks scout search
export function prewarmScouting() {
  fetchPrimary().catch(() => {});
}
