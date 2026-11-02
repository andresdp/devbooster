import { test as base, expect } from '@playwright/test';
import { createApi } from './api.js';

export const test = base.extend({
  api: async ({ playwright }, use) => {
    const api = await createApi(playwright);
    await use(api);
    await api.dispose();
  },
});

export { expect };
