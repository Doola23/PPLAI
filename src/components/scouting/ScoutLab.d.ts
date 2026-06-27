import type { FC } from 'react';

// ScoutLab is authored in JSX; declare its exports so .tsx consumers type-check.
declare const ScoutLab: FC<Record<string, never>>;
export default ScoutLab;

// Kicks off background prefetch/caching of the scouting data (no-op if already warm).
export function prewarmScouting(): void;
