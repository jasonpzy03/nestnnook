import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localUploadsEnabled, blobUploadsEnabled } from '../dist/media/upload-config.js';
import { MediaController } from '../dist/media/media.controller.js';

test('Vercel cannot enable local uploads, and unconfigured uploads return a useful error', async () => {
  const names = ['NODE_ENV', 'VERCEL', 'ALLOW_LOCAL_UPLOADS', 'BLOB_READ_WRITE_TOKEN'];
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_LOCAL_UPLOADS = 'true';
    process.env.VERCEL = '1';
    delete process.env.BLOB_READ_WRITE_TOKEN;
    assert.equal(localUploadsEnabled(), false);
    assert.equal(blobUploadsEnabled(), false);
    await assert.rejects(new MediaController().upload(), (error) => {
      assert.equal(error.getStatus(), 403);
      assert.match(error.message, /BLOB_READ_WRITE_TOKEN/);
      return true;
    });
    process.env.BLOB_READ_WRITE_TOKEN = 'test-configuration-only';
    assert.equal(blobUploadsEnabled(), true);
    // Invalid images are rejected before making any request to Blob.
    await assert.rejects(
      new MediaController().upload({ buffer: Buffer.from('not an image') }),
      (error) => error.getStatus() === 400,
    );
    delete process.env.VERCEL;
    assert.equal(localUploadsEnabled(), true);
    process.env.NODE_ENV = 'production';
    assert.equal(localUploadsEnabled(), false);
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});
