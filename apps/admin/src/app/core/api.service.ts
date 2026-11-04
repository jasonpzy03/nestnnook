import { Injectable, signal } from '@angular/core';
import { Catalog, ConnectionStatus } from './models';
import { preparePhoto } from './prepare-photo';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly authenticated = signal(false);
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`/api/${path}`, {
        method,
        credentials: 'same-origin',
        headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
        body:
          body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    } catch {
      throw new Error(
        'Cannot reach the management server. Check that it is running and try again.',
      );
    }
    if (!response.ok) {
      if (response.status === 401) this.authenticated.set(false);
      const error = await response.json().catch(() => ({}));
      const message = Array.isArray(error?.message) ? error.message.join(' ') : error?.message;
      const fallback: Record<number, string> = {
        401: 'Your session has expired. Sign in again and retry.',
        403: 'Access was denied. Refresh the page and sign in again. If this continues, check the API origin and deployment access settings.',
        413: 'The photo is too large for the server. Try a smaller photo.',
        429: 'Too many requests. Wait a moment before trying again.',
        502: 'The management server could not be reached. Please try again shortly.',
        503: 'The management server is temporarily unavailable. Please try again shortly.',
        504: 'The upload or request timed out. Check your connection and try a smaller photo.',
      };
      throw new Error(
        (typeof message === 'string' && message) ||
          fallback[response.status] ||
          `The request failed (HTTP ${response.status}). Please retry. If it continues, share this error code so we can check the server logs.`,
      );
    }
    return response.json();
  }
  async restore() {
    const user = await this.request<{ authenticated: boolean }>('auth/me');
    this.authenticated.set(user.authenticated);
  }
  async login(password: string) {
    const user = await this.request<{ authenticated: boolean }>('auth/login', 'POST', { password });
    this.authenticated.set(user.authenticated);
  }
  async logout() {
    await this.request('auth/logout', 'POST', {});
    this.authenticated.set(false);
  }
  catalog() {
    return this.request<Catalog>('catalog');
  }
  status() {
    return this.request<ConnectionStatus>('catalog/status');
  }
  save(catalog: Catalog) {
    return this.request<Catalog>('catalog', 'PUT', {
      revision: catalog.revision,
      rooms: catalog.rooms,
      locations: catalog.locations,
    });
  }
  publishEntry(kind: 'rooms' | 'locations', id: string, revision: number, publish: boolean) {
    return this.request<Catalog>(
      `catalog/${kind}/${encodeURIComponent(id)}/${publish ? 'publish' : 'unpublish'}`,
      'POST',
      { revision },
    );
  }
  async upload(file: File) {
    const photo = await preparePhoto(file);
    const body = new FormData();
    body.append('file', photo);
    return this.request<{ url: string }>('media', 'POST', body);
  }
}
