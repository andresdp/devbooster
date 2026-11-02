import { expect } from '@playwright/test';

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function openBoard(page, boardId) {
  await page.goto(`/boards/${boardId}`);
  await expect(column(page, 'To Do')).toBeVisible();
}

// The only structural locator in the suite: column sections have no accessible name.
// Follow-up: aria-labelledby in Column.tsx would allow getByRole('region', { name }) (R-10).
export function column(page, name) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: new RegExp(`^${escapeRegExp(name)}\\s*\\d+$`) }),
  });
}

export function card(col, key, title) {
  return col.getByRole('link', { name: `${key} ${title}`, exact: true });
}

export function cardsIn(col) {
  return col.getByRole('link', { name: /^TKT-\d+ / });
}

// Hover, press, move past the 6 px activation distance, glide to the target, release.
// `target` is a column or a card locator; the pointer is released at its centre. Aiming at a
// card's top edge makes the app crash ("Maximum update depth exceeded"), so reorders use the centre.
export async function dragCard(page, source, target) {
  await source.hover();
  const from = await source.boundingBox();
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10);
  const to = await target.boundingBox();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.up();
}
