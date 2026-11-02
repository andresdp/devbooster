import { baseURL, apiPrefix, apiURL, mode, runId } from './support/env.js';

async function probe(address) {
  try {
    const res = await fetch(address, { signal: AbortSignal.timeout(5_000) });
    return res.ok ? null : `HTTP ${res.status}`;
  } catch (err) {
    return err.cause?.code || err.message;
  }
}

export default async function globalSetup() {
  const targets = [baseURL, `${apiPrefix}/boards`];
  const failures = [];
  for (const address of targets) {
    const reason = await probe(address);
    if (reason) failures.push(`E2E target unreachable: ${address} (${reason})`);
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`E2E run ${runId} — mode ${mode}, web ${baseURL}, api ${apiURL}`);
}
