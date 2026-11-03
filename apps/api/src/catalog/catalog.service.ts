import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStore } from '../storage/catalog.store';
import { CatalogDto } from './catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly store: CatalogStore) {}
  read() {
    return this.store.read();
  }
  async save(input: CatalogDto) {
    const current = await this.read();
    if (
      current.snapshot?.rooms.some((room) => !input.rooms.some((item) => item.id === room.id)) ||
      current.snapshot?.locations.some(
        (location) => !input.locations.some((item) => item.id === location.id),
      )
    ) {
      throw new BadRequestException('Unpublish this entry before deleting it.');
    }
    const locationIds = new Set(input.locations.map((location) => location.id));
    if (
      locationIds.size !== input.locations.length ||
      new Set(input.rooms.map((room) => room.id)).size !== input.rooms.length
    ) {
      throw new BadRequestException('Room and location IDs must be unique.');
    }
    for (const room of input.rooms) {
      if (room.locationId && !locationIds.has(room.locationId))
        throw new BadRequestException('Choose an existing location or leave it unassigned.');
      if (!room.code.trim()) throw new BadRequestException('Room code is required.');
      if (room.type !== 'Common Area' && room.monthlyRent < 1)
        throw new BadRequestException('Monthly rent must be greater than zero.');
    }
    if (input.locations.some((location) => !location.name.trim()))
      throw new BadRequestException('Location name is required.');
    return this.store.save(
      {
        ...input,
        revision: input.revision + 1,
        updatedAt: new Date().toISOString(),
        snapshot: current.snapshot,
      },
      input.revision,
    );
  }
  async published() {
    const catalog = await this.read();
    return (
      catalog.snapshot ?? { revision: 0, createdAt: catalog.updatedAt, rooms: [], locations: [] }
    );
  }
  async publishEntry(kind: 'rooms' | 'locations', id: string, revision: number, publish: boolean) {
    const current = await this.read();
    if (current.revision !== revision) throw new ConflictException('Reload before publishing.');
    const snapshot = structuredClone(
      current.snapshot ?? { revision: 0, createdAt: '', rooms: [], locations: [] },
    );
    if (kind === 'rooms') {
      const room = current.rooms.find((item) => item.id === id);
      if (!room) throw new NotFoundException('Room not found.');
      if (publish) {
        if (!room.photos.length)
          throw new BadRequestException('Add a photo before publishing this room.');
        if (room.locationId && !snapshot.locations.some((item) => item.id === room.locationId))
          throw new BadRequestException('Publish this room’s location first.');
      }
      snapshot.rooms = snapshot.rooms.filter((item) => item.id !== id);
      if (publish) snapshot.rooms.push({ ...room, visible: true });
    } else {
      const location = current.locations.find((item) => item.id === id);
      if (!location) throw new NotFoundException('Location not found.');
      if (!publish && snapshot.rooms.some((room) => room.locationId === id))
        throw new BadRequestException(
          'Unpublish or move the published rooms in this location first.',
        );
      snapshot.locations = snapshot.locations.filter((item) => item.id !== id);
      if (publish) snapshot.locations.push({ ...location, visible: true });
    }
    return this.store.save(
      {
        ...current,
        revision: revision + 1,
        snapshot: { ...snapshot, revision, createdAt: new Date().toISOString() },
      },
      revision,
    );
  }
}
