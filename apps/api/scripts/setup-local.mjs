import { randomBytes, scryptSync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
await mkdir('.data', { recursive: true });
await writeFile(
  '.env',
  [
    'NODE_ENV=development',
    'PORT=3000',
    'ADMIN_ORIGIN=http://127.0.0.1:4201',
    'ADMIN_EMAIL=admin@nestnnook.local',
    `ADMIN_PASSWORD_HASH=${hash}`,
    'STORAGE_DRIVER=local',
    'ALLOW_LOCAL_UPLOADS=true',
    '',
  ].join('\n'),
  { flag: 'wx' },
);
await writeFile(
  '.data/local-login.txt',
  `Local development only\nEmail: admin@nestnnook.local\nPassword: ${password}\n`,
  { flag: 'wx' },
);
console.log('Created .env and .data/local-login.txt. Existing configuration is never overwritten.');
