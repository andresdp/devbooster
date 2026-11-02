import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeRunId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');
  return `${stamp}-${randomBytes(2).toString('hex')}`;
}

// Workers inherit the id through the environment so every process shares one run id.
export const runId = process.env.E2E_RUN_ID || makeRunId();
process.env.E2E_RUN_ID = runId;

const baseUrlSet = !!process.env.BASE_URL;
const apiUrlSet = !!process.env.API_URL;

export const mode = baseUrlSet ? 'external' : 'managed';

function cleanUrl(name, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return value.replace(/\/+$/, '');
}

if (mode === 'external' && !apiUrlSet) {
  throw new Error('API_URL is required when BASE_URL is set (backend address used for test setup)');
}
if (mode === 'managed' && apiUrlSet) {
  throw new Error(
    'API_URL is set but BASE_URL is not: set both to target a running app, or unset API_URL for a managed run',
  );
}

export const baseURL = cleanUrl('BASE_URL', process.env.BASE_URL || 'http://localhost:5173');
export const apiURL = cleanUrl('API_URL', process.env.API_URL || 'http://localhost:8000');
export const apiPrefix = `${apiURL}/api/v1`;
export const databaseURL = `sqlite:///${join(tmpdir(), `kanban-e2e-${runId}.db`)}`;
