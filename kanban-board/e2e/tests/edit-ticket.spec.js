import { test, expect } from '../support/fixtures.js';
import { uniqueName } from '../support/names.js';
import { openBoard, column, cardsIn } from '../support/board.js';

test.describe('edit', () => {
  test('saves every edited field and keeps key, column and position', async ({ page, api }) => {
    const board = await api.createBoard(uniqueName('edit'));
    await api.createTicket(board.id, { title: uniqueName('edit first') });
    const middle = await api.createTicket(board.id, { title: uniqueName('edit middle') });
    await api.createTicket(board.id, { title: uniqueName('edit last') });
    const newTitle = uniqueName('edit changed');
    await openBoard(page, board.id);

    await test.step('edit every field of the middle ticket', async () => {
      await cardsIn(column(page, 'To Do')).nth(1).click();
      const drawer = page.getByRole('dialog');
      await drawer.getByRole('button', { name: 'Edit' }).click();
      await drawer.getByLabel('Title').fill(newTitle);
      await drawer.getByLabel('Description').fill('Edited by the E2E suite');
      await drawer.getByRole('radiogroup', { name: 'Type' }).getByRole('radio', { name: 'Bug' }).click();
      await drawer
        .getByRole('radiogroup', { name: 'Priority' })
        .getByRole('radio', { name: 'Critical' })
        .click();
      await drawer.getByLabel('Assignee').fill('e2e-editor');
      await drawer.getByRole('button', { name: 'Save' }).click();
      await expect(drawer.getByRole('button', { name: 'Edit' })).toBeVisible();
      await drawer.getByRole('button', { name: 'Close' }).click();
      await expect(drawer).toBeHidden();
    });

    await test.step('after reload the card keeps its key, column and position', async () => {
      await page.reload();
      const card = cardsIn(column(page, 'To Do')).nth(1);
      await expect(card).toHaveAccessibleName(`${middle.key} ${newTitle}`);
      await card.click();
      const drawer = page.getByRole('dialog');
      await expect(drawer.getByRole('heading', { name: `${middle.key} ${newTitle}` })).toBeVisible();
      await expect(drawer.getByText('Edited by the E2E suite')).toBeVisible();
      await expect(drawer.getByText('Bug', { exact: true })).toBeVisible();
      await expect(drawer.getByText('Critical', { exact: true })).toBeVisible();
      await expect(drawer.getByText('e2e-editor')).toBeVisible();
    });
  });

  test('rejects an empty title and keeps the old one', async ({ page, api }) => {
    const board = await api.createBoard(uniqueName('edit required'));
    const { key, title } = await api.createTicket(board.id, { title: uniqueName('edit required ticket') });
    await openBoard(page, board.id);

    await test.step('clear the title and save', async () => {
      await cardsIn(column(page, 'To Do')).first().click();
      const drawer = page.getByRole('dialog');
      await drawer.getByRole('button', { name: 'Edit' }).click();
      await drawer.getByLabel('Title').fill('');
      await drawer.getByRole('button', { name: 'Save' }).click();
      await expect(drawer.getByText('Required', { exact: true })).toBeVisible();
      await expect(drawer.getByRole('button', { name: 'Save' })).toBeVisible();
      await drawer.getByRole('button', { name: 'Close' }).click();
      await expect(drawer).toBeHidden();
    });

    await test.step('the old title remains after reload', async () => {
      await page.reload();
      await expect(cardsIn(column(page, 'To Do')).first()).toHaveAccessibleName(`${key} ${title}`);
    });
  });
});
