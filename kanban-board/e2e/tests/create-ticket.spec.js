import { test, expect } from '../support/fixtures.js';
import { uniqueName } from '../support/names.js';
import { openBoard, column, cardsIn } from '../support/board.js';

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('create', () => {
  test('shows the new ticket at the bottom of To Do after reload', async ({ page, api }) => {
    const board = await api.createBoard(uniqueName('create'));
    await api.createTicket(board.id);
    const title = uniqueName('create new ticket');
    const todo = column(page, 'To Do');
    let key;

    await openBoard(page, board.id);

    await test.step('create a ticket from the board', async () => {
      await page.getByRole('button', { name: '+ New ticket' }).click();
      const dialog = page.getByRole('dialog', { name: 'New ticket' });
      await dialog.getByLabel('Title').fill(title);
      await dialog.getByLabel('Description').fill('Created by the E2E suite');
      await dialog.getByLabel('Type').selectOption({ label: 'Bug' });
      await dialog.getByLabel('Priority').selectOption({ label: 'High' });
      await dialog.getByLabel('Assignee').fill('e2e-bot');
      await dialog.getByRole('button', { name: 'Create ticket' }).click();
      await expect(dialog).toBeHidden();
    });

    await test.step('the ticket is the last card in To Do', async () => {
      const last = cardsIn(todo).last();
      await expect(last).toHaveAccessibleName(new RegExp(`^TKT-\\d+ ${escapeRegExp(title)}$`));
      key = (await last.getAttribute('aria-label')).split(' ')[0];
    });

    await test.step('it is still there after reload with every value', async () => {
      await page.reload();
      const last = cardsIn(column(page, 'To Do')).last();
      await expect(last).toHaveAccessibleName(`${key} ${title}`);
      await last.click();
      const drawer = page.getByRole('dialog');
      await expect(drawer.getByRole('heading', { name: `${key} ${title}` })).toBeVisible();
      await expect(drawer.getByText('Created by the E2E suite')).toBeVisible();
      await expect(drawer.getByText('Bug', { exact: true })).toBeVisible();
      await expect(drawer.getByText('High', { exact: true })).toBeVisible();
      await expect(drawer.getByText('e2e-bot')).toBeVisible();
    });
  });

  test('rejects a ticket without a title', async ({ page, api }) => {
    const board = await api.createBoard(uniqueName('create required'));
    await openBoard(page, board.id);

    await test.step('submit the form with an empty title', async () => {
      await page.getByRole('button', { name: '+ New ticket' }).click();
      const dialog = page.getByRole('dialog', { name: 'New ticket' });
      await dialog.getByRole('button', { name: 'Create ticket' }).click();
      await expect(dialog.getByText('Required', { exact: true })).toBeVisible();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();
    });

    await test.step('no ticket exists after reload', async () => {
      await page.reload();
      await expect(cardsIn(column(page, 'To Do'))).toHaveCount(0);
    });
  });
});
