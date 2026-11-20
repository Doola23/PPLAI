import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn(() => new Promise(() => {})) },
}));

const MODULES = import.meta.glob(['./*.ts', '!./*.test.*', './components/**/*.jsx', '../ScoutLab.jsx']);

describe('ScoutLab modules', () => {
  it('every module evaluates without missing imports', async () => {
    const entries = Object.entries(MODULES);
    expect(entries.length).toBeGreaterThanOrEqual(23);
    for (const [file, load] of entries) {
      await expect(load(), file).resolves.toBeTruthy();
    }
  }, 60_000);

  it('renders the app shell', async () => {
    const { default: ScoutLab } = await import('../ScoutLab.jsx');
    const html = renderToString(<MemoryRouter><ScoutLab /></MemoryRouter>);
    expect(html).toContain('scoutlab-root');
  });
});

describe('scouting engine', () => {
  it('pct ranks a value within a distribution', async () => {
    const { pct } = await import('./engine');
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(pct(10, arr)).toBeGreaterThan(pct(5, arr));
    expect(pct(1, arr)).toBeLessThan(pct(5, arr));
  });

  it('gv reads the first present column', async () => {
    const { gv } = await import('./engine');
    expect(gv({ b: 2 }, ['a', 'b'])).toBe(2);
  });
});
