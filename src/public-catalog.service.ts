import {
  inject,
  Injectable,
  InjectionToken,
  makeStateKey,
  TransferState,
  REQUEST,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';

export interface PublicCatalog {
  rooms: {
    id: string;
    code: string;
    type: string;
    locationId: string;
    monthlyRent: number;
    features: string[];
    description: string;
    featured: boolean;
    order: number;
    photos: { url: string; alt: string }[];
  }[];
  locations: {
    id: string;
    name: string;
    journey: string;
    description: string;
    image: string;
    order: number;
  }[];
}
export const CATALOG_URL = new InjectionToken<string>('Server catalogue URL');
export const RENDER_REQUEST = new InjectionToken<boolean>('Live SSR request');
const CATALOG_STATE = makeStateKey<PublicCatalog>('published-catalog');

@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
  private readonly transfer = inject(TransferState);
  private readonly endpoint = inject(CATALOG_URL, { optional: true });
  private data: PublicCatalog = { rooms: [], locations: [] };
  private readonly extractingRoutes =
    isPlatformServer(inject(PLATFORM_ID)) &&
    !inject(REQUEST, { optional: true }) &&
    !inject(RENDER_REQUEST, { optional: true });

  async load() {
    // Angular boots the app to discover routes at build time, without an HTTP request.
    if (this.extractingRoutes) return;
    if (this.transfer.hasKey(CATALOG_STATE)) {
      this.data = this.transfer.get(CATALOG_STATE, this.data);
      this.transfer.remove(CATALOG_STATE);
      return;
    }
    if (!this.endpoint) throw new Error('The public website requires server rendering.');
    const response = await fetch(this.endpoint, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Published catalogue is unavailable.');
    this.data = await response.json();
    // Resolve local development uploads against the API, not the client host.
    const mediaUrl = (url: string) =>
      url.startsWith('/uploads/') ? new URL(url, this.endpoint!).href : url;
    this.data.rooms.forEach((room) =>
      room.photos.forEach((photo) => (photo.url = mediaUrl(photo.url))),
    );
    this.data.locations.forEach((location) => (location.image = mediaUrl(location.image)));
    this.transfer.set(CATALOG_STATE, this.data);
  }

  get rooms() {
    return [...this.data.rooms]
      .filter((room) => room.type !== 'Common Area' && room.photos.length > 0)
      .sort((a, b) => a.order - b.order)
      .map((room) => {
        const location = this.data.locations.find((item) => item.id === room.locationId);
        return { ...room, locationName: location?.name || '', journey: location?.journey || '' };
      });
  }
  get locations() {
    return [...this.data.locations].sort((a, b) => a.order - b.order);
  }
}
