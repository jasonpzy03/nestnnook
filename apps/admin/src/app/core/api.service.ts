import { Injectable, signal } from '@angular/core';
import { Catalog, ConnectionStatus } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly email = signal('');
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
      if (response.status === 401) this.email.set('');
      const error = await response.json().catch(() => ({}));
      const message = Array.isArray(error.message) ? error.message.join(' ') : error.message;
      throw new Error(message || 'The request could not be completed. Please try again.');
    }
    return response.json();
  }
  async restore() {
    const user = await this.request<{ email: string }>('auth/me');
    this.email.set(user.email);
  }
  async login(email: string, password: string) {
    const user = await this.request<{ email: string }>('auth/login', 'POST', { email, password });
    this.email.set(user.email);
  }
  async logout() {
    await this.request('auth/logout', 'POST', {});
    this.email.set('');
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
    if (file.size > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.');
    const body = new FormData();
    body.append('file', file);
    return this.request<{ url: string }>('media', 'POST', body);
  }
}
