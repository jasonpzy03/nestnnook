import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import { createServer } from 'node:net';

test('admin authentication, catalogue lifecycle, optimistic locking and upload validation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nestnnook-api-test-'));
  const origin = 'http://127.0.0.1:4201';
  const password = randomBytes(24).toString('hex');
  const salt = randomBytes(16).toString('hex');
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  // No seed file in this working directory: the compiled API must resolve its own dependency.
  const server = spawn(process.execPath, [resolve('dist/main.js')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      STORAGE_DRIVER: 'local',
      ADMIN_ORIGIN: origin,
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
      ALLOW_LOCAL_UPLOADS: 'true',
      BLOB_READ_WRITE_TOKEN: '',
      VERCEL: '',
    },
    stdio: 'pipe',
  });
  let log = '';
  server.stdout.on('data', (chunk) => (log += chunk));
  server.stderr.on('data', (chunk) => (log += chunk));
  let cookie = '';
  const request = (path, method = 'GET', body, headers = {}) =>
    fetch(`http://127.0.0.1:${port}/api/${path}`, {
      method,
      headers: {
        origin,
        cookie,
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  try {
    for (let i = 0; i < 100; i++) {
      try {
        await request('auth/me');
        break;
      } catch {
        if (i === 99) throw new Error(log);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.equal((await request('catalog')).status, 401);
    assert.equal(
      (await request('catalog/rooms/room-1/publish', 'POST', { revision: 0 })).status,
      401,
    );
    assert.equal(
      (await request('auth/login', 'POST', { password }, { origin: 'https://evil.example' }))
        .status,
      403,
    );
    assert.equal((await request('auth/login', 'POST', { password: 'wrong' })).status, 401);
    assert.equal((await request('auth/login', 'POST', {})).status, 400);
    assert.equal((await request('auth/login', 'POST', { password: '' })).status, 400);
    const login = await request('auth/login', 'POST', { password });
    assert.equal(login.status, 201);
    assert.deepEqual(await login.json(), { authenticated: true });
    assert.match(login.headers.get('set-cookie'), /HttpOnly/);
    assert.match(login.headers.get('set-cookie'), /SameSite=Strict/);
    cookie = login.headers.get('set-cookie').split(';')[0];
    assert.deepEqual(await (await request('auth/me')).json(), { authenticated: true });
    assert.deepEqual(
      (await (await request('public/catalog', 'GET', undefined, { cookie: '' })).json()).rooms,
      [],
    );
    let catalog = await (await request('catalog')).json();
    assert.equal(catalog.rooms.length, 8);
    const payload = () => ({
      revision: catalog.revision,
      rooms: catalog.rooms,
      locations: catalog.locations,
    });
    const invalid = structuredClone(payload());
    invalid.rooms[0].monthlyRent = -10;
    assert.equal((await request('catalog', 'PUT', invalid)).status, 400);
    const invalidRelation = structuredClone(payload());
    invalidRelation.rooms[0].locationId = 'missing';
    assert.equal((await request('catalog', 'PUT', invalidRelation)).status, 400);
    const draft = structuredClone(catalog.rooms[0]);
    draft.id = 'test-room';
    draft.code = 'TEST';
    draft.visible = false;
    catalog.rooms.push(draft);
    const stale = structuredClone(payload());
    let response = await request('catalog', 'PUT', payload());
    assert.equal(response.status, 200);
    catalog = await response.json();
    assert.equal(catalog.rooms.length, 9);
    assert.equal((await request('catalog', 'PUT', stale)).status, 409);
    catalog.rooms.find((room) => room.id === 'test-room').monthlyRent = 1234;
    response = await request('catalog', 'PUT', payload());
    assert.equal(response.status, 200);
    catalog = await response.json();
    assert.equal(catalog.rooms.find((room) => room.id === 'test-room').monthlyRent, 1234);
    const persisted = JSON.parse(await readFile(join(root, '.data/catalog.json'), 'utf8'));
    assert.equal(persisted.revision, catalog.revision);
    const action = (kind, id, verb = 'publish', revision = catalog.revision) =>
      request(`catalog/${kind}/${id}/${verb}`, 'POST', { revision });
    const live = async () =>
      (await request('public/catalog', 'GET', undefined, { cookie: '' })).json();
    assert.equal(
      (await request('catalog/publish', 'POST', { revision: catalog.revision })).status,
      404,
    );
    assert.equal((await action('rooms', 'missing')).status, 404);
    response = await action('rooms', 'room-1');
    assert.equal(response.status, 201);
    catalog = await response.json();
    assert.deepEqual(
      (await live()).rooms.map((room) => room.id),
      ['room-1'],
    );
    const firstPublished = structuredClone(catalog.snapshot);
    catalog.rooms[0].monthlyRent = 2222;
    catalog.rooms[1].monthlyRent = 3333;
    catalog = await (await request('catalog', 'PUT', payload())).json();
    assert.deepEqual(
      await live(),
      firstPublished,
      'Saving drafts must preserve published versions',
    );
    const revision = catalog.revision;
    catalog = await (await action('rooms', 'room-2')).json();
    assert.equal((await action('rooms', 'room-1', 'publish', revision)).status, 409);
    assert.equal((await live()).rooms.find((room) => room.id === 'room-1').monthlyRent, 1688);
    assert.equal((await live()).rooms.find((room) => room.id === 'room-2').monthlyRent, 3333);
    catalog = await (await action('rooms', 'room-1')).json();
    assert.equal((await live()).rooms.find((room) => room.id === 'room-1').monthlyRent, 2222);
    const deletingLiveRoom = structuredClone(payload());
    deletingLiveRoom.rooms = deletingLiveRoom.rooms.filter((room) => room.id !== 'room-1');
    assert.equal((await request('catalog', 'PUT', deletingLiveRoom)).status, 400);
    catalog = await (await action('rooms', 'room-1', 'unpublish')).json();
    assert.deepEqual(
      (await live()).rooms.map((room) => room.id),
      ['room-2'],
    );
    assert.ok(
      catalog.rooms.some((room) => room.id === 'room-1'),
      'Unpublishing retains the draft',
    );
    catalog = await (await action('rooms', 'room-2', 'unpublish')).json();
    assert.deepEqual(
      (await live()).rooms,
      [],
      'Unpublishing the last room leaves a valid empty catalogue',
    );
    catalog.rooms = catalog.rooms.filter((room) => room.id !== 'test-room');
    catalog.locations.push({
      id: 'test-location',
      name: 'Test location',
      journey: 'Test journey',
      description: '',
      image: '',
      visible: true,
      order: 20,
    });
    catalog.rooms[0].locationId = 'test-location';
    catalog = await (await request('catalog', 'PUT', payload())).json();
    assert.equal(
      (await action('rooms', 'room-1')).status,
      400,
      'Publish the assigned location first',
    );
    catalog = await (await action('locations', 'test-location')).json();
    assert.equal((await live()).locations.length, 1);
    catalog = await (await action('rooms', 'room-1')).json();
    assert.equal((await action('locations', 'test-location', 'unpublish')).status, 400);
    catalog.locations.find((location) => location.id === 'test-location').name = 'New draft name';
    catalog = await (await request('catalog', 'PUT', payload())).json();
    catalog = await (await action('rooms', 'room-1')).json();
    assert.equal(
      (await live()).locations[0].name,
      'Test location',
      'Room publishing must not publish location edits',
    );
    const publishedRooms = (await live()).rooms;
    catalog = await (await action('locations', 'test-location')).json();
    assert.equal((await live()).locations[0].name, 'New draft name');
    assert.deepEqual((await live()).rooms, publishedRooms);
    catalog = await (await action('rooms', 'room-1', 'unpublish')).json();
    catalog = await (await action('locations', 'test-location', 'unpublish')).json();
    catalog.rooms[0].locationId = '';
    catalog.locations = catalog.locations.filter((location) => location.id !== 'test-location');
    catalog = await (await request('catalog', 'PUT', payload())).json();
    assert.equal(catalog.locations.length, 5);
    const noPhoto = structuredClone(catalog.rooms[0]);
    noPhoto.id = 'no-photo';
    noPhoto.visible = false;
    noPhoto.photos = [];
    catalog.rooms.push(noPhoto);
    catalog = await (await request('catalog', 'PUT', payload())).json();
    assert.equal((await action('rooms', 'no-photo')).status, 400);
    const upload = new FormData();
    upload.append(
      'file',
      new Blob(['<svg onload="alert(1)"></svg>'], { type: 'image/png' }),
      'fake.png',
    );
    assert.equal((await request('media', 'POST', upload)).status, 400);
    const png = new FormData();
    png.append(
      'file',
      new Blob(
        [
          Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWsAAAAASUVORK5CYII=',
            'base64',
          ),
        ],
        { type: 'image/png' },
      ),
      'pixel.png',
    );
    response = await request('media', 'POST', png);
    assert.equal(response.status, 201);
    assert.match((await response.json()).url, /^\/uploads\/[a-f0-9-]+\.png$/);
    assert.equal((await request('auth/logout', 'POST', {})).status, 201);
    assert.equal((await request('catalog')).status, 401);
    for (let i = 0; i < 10; i++) await request('auth/login', 'POST', { password: 'wrong' });
    assert.equal((await request('auth/login', 'POST', { password: 'wrong' })).status, 429);
  } finally {
    server.kill();
    if (server.exitCode === null) await once(server, 'exit');
    await rm(root, { recursive: true, force: true });
  }
});
