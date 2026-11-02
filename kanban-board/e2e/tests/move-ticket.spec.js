import { test, expect } from '../support/fixtures.js';
import { uniqueName } from '../support/names.js';
import { openBoard, column, card, cardsIn, dragCard } from '../support/board.js';

async function moveFromDrawer(page, key, title, columnName) {
  await page.getByRole('link', { name: `${key} ${title}`, exact: true }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByLabel('Move to').selectOption({ label: columnName });
  await drawer.getByRole('button', { name: 'Move' }).click();
  await expect(drawer.getByText(columnName, { exact: true }).first()).toBeVisible();
  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toBeHidden();
}

test.describe('move', () => {
  test('drags a card from To Do to In Progress', async ({ page, api }) => {
    const board = await api.createBoard(uniqueName('move drag'));
    const { key, title } = await api.createTicket(board.id, { title: uniqueName('move drag ticket') });
    await openBoard(page, board.id);
    const todo = column(page, 'To Do');
    const doing = column(page, 'In Progress');

    await test.step('drag the card to In Progress', async () => {
      await dragCard(page, card(todo, key, title), doing);
      await expect(card(doing, key, title)).toBeVisible();
      await expect(cardsIn(todo)).toHaveCount(0);
      await expect(page.getByText('Saving move…')).toHaveCount(0);
    });

    await test.step('the move persists after reload', async () => {
      await page.reload();
      await expect(card(column(page, 'In Progress'), key, title)).toBeVisible();
      await expect(cardsIn(column(page, 'To Do'))).toHaveCount(0);
    });
  });

  test('moves a ticket to Review from the detail view', async ({ page, api }) => {
    const board = await api.createBoard(uniqueName('move drawer'));
    const inProgress = board.columnId('In Progress');
    const review = board.columnId('Review');
    const target = await api.createTicket(board.id, { title: uniqueName('move drawer target') });
    const other = await api.createTicket(board.id, { title: uniqueName('move drawer other') });
    const inReview = await api.createTicket(board.id, { title: uniqueName('move drawer review') });
    await api.moveTicket(target.key, inProgress);
    await api.moveTicket(other.key, inProgress);
    await api.moveTicket(inReview.key, review);
    await openBoard(page, board.id);

    await test.step('move the ticket to Review from its detail view', async () => {
      await moveFromDrawer(page, target.key, target.title, 'Review');
      await expect(card(column(page, 'Review'), target.key, target.title)).toBeVisible();
    });

    await test.step('it is the last card in Review after reload', async () => {
      await page.reload();
      await expect(cardsIn(column(page, 'Review')).last()).toHaveAccessibleName(
        `${target.key} ${target.title}`,
      );
      await expect(card(column(page, 'In Progress'), target.key, target.title)).toHaveCount(0);
    });
  });

  test('records creation and both column changes in history', async ({ page, api }) => {
    const board = await api.createBoard(uniqueName('move history'));
    const { key, title } = await api.createTicket(board.id, { title: uniqueName('move history ticket') });
    await openBoard(page, board.id);

    await test.step('drag it to In Progress', async () => {
      await dragCard(page, card(column(page, 'To Do'), key, title), column(page, 'In Progress'));
      await expect(card(column(page, 'In Progress'), key, title)).toBeVisible();
      await expect(page.getByText('Saving move…')).toHaveCount(0);
    });

    await test.step('move it to Review from the detail view', async () => {
      await moveFromDrawer(page, key, title, 'Review');
      await expect(card(column(page, 'Review'), key, title)).toBeVisible();
    });

    await test.step('the history lists all three entries after reload', async () => {
      await page.reload();
      await page.getByRole('link', { name: `${key} ${title}`, exact: true }).click();
      const drawer = page.getByRole('dialog');
      await drawer.getByRole('tab', { name: /^History/ }).click();
      await expect(drawer.getByRole('listitem')).toHaveText([
        /^Created in To Do/,
        /^To Do → In Progress/,
        /^In Progress → Review/,
      ]);
    });
  });

  test('reorders a card to the top of its column', async ({ page, api }) => {
    const board = await api.createBoard(uniqueName('move reorder'));
    const a = await api.createTicket(board.id, { title: uniqueName('move reorder A') });
    const b = await api.createTicket(board.id, { title: uniqueName('move reorder B') });
    const c = await api.createTicket(board.id, { title: uniqueName('move reorder C') });
    const names = [c, a, b].map((t) => `${t.key} ${t.title}`);
    await openBoard(page, board.id);
    const todo = column(page, 'To Do');

    await test.step('drag C above A', async () => {
      await dragCard(page, card(todo, c.key, c.title), card(todo, a.key, a.title));
      await expect(cardsIn(todo).first()).toHaveAccessibleName(names[0]);
      await expect(page.getByText('Saving move…')).toHaveCount(0);
    });

    await test.step('the order persists after reload', async () => {
      await page.reload();
      const cards = cardsIn(column(page, 'To Do'));
      await expect(cards).toHaveCount(3);
      for (const [i, name] of names.entries()) {
        await expect(cards.nth(i)).toHaveAccessibleName(name);
      }
    });
  });
});
