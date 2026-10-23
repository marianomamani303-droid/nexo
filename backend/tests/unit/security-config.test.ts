import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const run = promisify(execFile);
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const script =
  "import { sessionCookieOptions } from './src/config/security.ts'; console.log(JSON.stringify(sessionCookieOptions));";
const environment = {
  ...process.env,
  NODE_ENV: 'production',
  FRONTEND_ORIGIN: 'https://app.example.com',
  JWT_SECRET: 'unit-test-only-secret-of-more-than-thirty-two-bytes',
};

await test('producción exige HTTPS y establece cookies HttpOnly, Secure y SameSite', async () => {
  const result = await run(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', script],
    { cwd, env: environment },
  );
  const parsed: unknown = JSON.parse(result.stdout);
  const cookie = z
    .object({ secure: z.boolean(), httpOnly: z.boolean(), sameSite: z.string(), path: z.string() })
    .parse(parsed);
  assert.deepEqual(cookie, { secure: true, httpOnly: true, sameSite: 'lax', path: '/' });
  await assert.rejects(
    run(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      cwd,
      env: { ...environment, FRONTEND_ORIGIN: 'http://app.example.com' },
    }),
  );
  await assert.rejects(
    run(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      cwd,
      env: { ...environment, JWT_SECRET: 'short' },
    }),
  );
});
