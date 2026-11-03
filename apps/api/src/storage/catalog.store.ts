import { Injectable, ConflictException } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Catalog } from '../catalog/catalog.dto';

@Injectable()
export class CatalogStore {
  readonly driver = process.env.STORAGE_DRIVER || 'local';
  private readonly key = `${process.env.REDIS_KEY_PREFIX || 'nestnnook'}:catalog:v1`;
  private readonly file = resolve('.data/catalog.json');
  private readonly redis?: Redis;
  private queue: Promise<unknown> = Promise.resolve();
  constructor() {
    if (!['local', 'upstash'].includes(this.driver)) throw new Error('Invalid STORAGE_DRIVER');
    if (process.env.NODE_ENV === 'production' && this.driver !== 'upstash')
      throw new Error('Production requires Upstash storage.');
    if (this.driver === 'upstash') {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)
        throw new Error('Upstash credentials are missing.');
      this.redis = Redis.fromEnv();
    }
  }
  async read(): Promise<Catalog> {
    if (this.redis) {
      const current = await this.redis.get<Catalog>(this.key);
      if (current) return current;
      const seed = await this.seed();
      await this.redis.set(this.key, seed, { nx: true });
      return (await this.redis.get<Catalog>(this.key))!;
    }
    try {
      return JSON.parse(await readFile(this.file, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return this.seed();
    }
  }
  private async seed(): Promise<Catalog> {
    return JSON.parse(await readFile(resolve('seed/catalog.json'), 'utf8'));
  }
  async save(next: Catalog, expected: number): Promise<Catalog> {
    if (this.redis) {
      // Compare and swap in Redis prevents one editor overwriting another's changes.
      const changed = await this.redis.eval<[number, string], number>(
        `local raw = redis.call('GET', KEYS[1]); if not raw then return 0 end; local current = cjson.decode(raw); if current.revision ~= tonumber(ARGV[1]) then return 0 end; redis.call('SET', KEYS[1], ARGV[2]); return 1`,
        [this.key],
        [expected, JSON.stringify(next)],
      );
      if (changed !== 1)
        throw new ConflictException('Someone else updated the catalogue. Reload before saving.');
      return next;
    }
    const operation = this.queue.then(async () => {
      if ((await this.read()).revision !== expected)
        throw new ConflictException('The catalogue changed. Reload before saving.');
      await mkdir(resolve('.data'), { recursive: true });
      await writeFile(this.file + '.tmp', JSON.stringify(next, null, 2));
      await rename(this.file + '.tmp', this.file);
      return next;
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
