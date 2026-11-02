import { apiPrefix } from './env.js';
import { uniqueName } from './names.js';

// Setup data only. The step under test and every outcome assertion go through the UI.
export async function createApi(playwright) {
  const context = await playwright.request.newContext({ baseURL: `${apiPrefix}/` });

  async function send(method, path, body, expected) {
    const response = await context.fetch(path, {
      method,
      ...(body === undefined ? {} : { data: body }),
    });
    if (response.status() !== expected) {
      const text = await response.text();
      let detail = text;
      try {
        const { error } = JSON.parse(text);
        if (error?.code) detail = `${error.code} ${error.message}`;
      } catch {
        // not the uniform error body: keep the raw text
      }
      throw new Error(`${method} ${path} → ${response.status()}: ${detail}`);
    }
    return response.json();
  }

  return {
    async createBoard(name) {
      const board = await send('POST', 'boards', { name }, 201);
      const columns = board.columns.map(({ id, name: columnName }) => ({ id, name: columnName }));
      return {
        id: board.id,
        columns,
        columnId(columnName) {
          const column = columns.find((c) => c.name === columnName);
          if (!column) throw new Error(`Column not found: ${columnName}`);
          return column.id;
        },
      };
    },

    async createTicket(boardId, fields = {}) {
      const body = { ...fields, title: fields.title ?? uniqueName('ticket') };
      const ticket = await send('POST', `boards/${boardId}/tickets`, body, 201);
      return { key: ticket.key, title: ticket.title };
    },

    async moveTicket(key, columnId, position) {
      const body = { column_id: columnId, ...(position === undefined ? {} : { position }) };
      await send('POST', `tickets/${key}/move`, body, 200);
    },

    dispose: () => context.dispose(),
  };
}
