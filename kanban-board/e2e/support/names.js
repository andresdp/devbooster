import { runId } from './env.js';

// The "E2E " prefix is reserved for data created by this suite.
export function uniqueName(label) {
  const name = `E2E ${runId} ${label}`;
  if (name.length > 100) {
    throw new Error(`Name too long (${name.length} > 100): ${name}`);
  }
  return name;
}
