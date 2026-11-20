import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:3011';
const PASSWORD = 'Password1';

// Fails the test on any uncaught browser error (render crashes, missing imports, …).
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

// Project rule: mobile view must be fully visible — no horizontal page scroll.
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(1);
}

async function createUser(page: Page, role = 'scout') {
  const email = `e2e-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.dev`;
  const signup = await page.request.post(`${API}/api/auth/signup`, {
    data: { name: 'E2E User', email, password: PASSWORD, role },
  });
  expect(signup.ok()).toBeTruthy();
  const { token } = await signup.json();
  const patch = await page.request.patch(`${API}/api/auth/me`, {
    data: { onboardingComplete: true, favoriteClub: 'Arsenal' },
    headers: { authorization: `Bearer ${token}` },
  });
  expect(patch.ok()).toBeTruthy();
  return email;
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByPlaceholder('you@club.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/dashboard/);
}

test('landing page renders', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('body')).toContainText(/PLAI/i);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('login → dashboard shows live data', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, await createUser(page));
  await expect(page.locator('body')).toContainText(/injur/i);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('injury risk loads the selected squad from the API', async ({ page }) => {
  const errors = trackErrors(page);
  const { dates } = await (await page.request.get(`${API}/api/injuries/teams/Arsenal/dates`)).json();
  const squad = await (await page.request.get(`${API}/api/injuries/predictions?team=Arsenal&date=${dates[0]}`)).json();
  const player = squad.items.sort((a: { minutes_played_this_match: number }, b: { minutes_played_this_match: number }) =>
    b.minutes_played_this_match - a.minutes_played_this_match)[0].player_name as string;

  await login(page, await createUser(page));
  await page.goto('/injury-risk');
  await expect(page.locator('body')).toContainText('Arsenal');
  // The default view is Arsenal's first match; its top-minutes player must be rendered.
  await expect(page.locator('body')).toContainText(player.split(' ').slice(-1)[0]);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('scout lab: search → drawer → full report with per-player extras', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, await createUser(page));
  await page.goto('/scout-search');

  // Club context → suggested recruitment brief → filters
  await page.getByText('Arsenal', { exact: true }).first().click();
  await expect(page.locator('.scoutlab-root')).toContainText(/High Press/i);
  await page.getByText(/Clinical Striker/i).first().click();

  // League filter options come from the player pool
  await expect(page.locator('.scoutlab-root')).toContainText('Premier League');

  await page.getByRole('button', { name: /Search Players/ }).click();
  await expect(page.locator('.scoutlab-root')).toContainText(/\d+\s*matches/i);

  // Result → quick drawer → full report (loads shot map, match log, similarity for that player)
  await page.getByText(/Sørloth/).first().click();
  const similar = page.waitForResponse((r) => r.url().includes('/api/scouting/similar/'));
  const shots = page.waitForResponse((r) => r.url().includes('/api/scouting/shot-maps/'));
  await page.getByText('View Full Report').click();
  expect((await similar).ok()).toBeTruthy();
  expect((await shots).ok()).toBeTruthy();

  await expect(page.getByText('Total Shots')).toBeVisible();
  await expect(page.getByText('Head-to-Head Comparison')).toBeVisible();
  await expect(page.getByText('ML Player Similarity')).toBeVisible();
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('match predictions page renders fixtures', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, await createUser(page, 'analyst'));
  await page.goto('/match-predictions');
  await expect(page.locator('body')).toContainText(/Arsenal|Liverpool|Chelsea/);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});
