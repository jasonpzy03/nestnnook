import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './core/api.service';
import { Catalog, ConnectionStatus, Location, Room, ROOM_TYPES } from './core/models';
import { IconComponent } from './shared/icon.component';
import { RoomEditorComponent } from './features/rooms/room-editor.component';
import { LocationEditorComponent } from './features/locations/location-editor.component';
type Section = 'overview' | 'rooms' | 'locations';

@Component({
  selector: 'admin-root',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, RoomEditorComponent, LocationEditorComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editorError = signal('');
  readonly section = signal<Section>('overview');
  readonly catalog = signal<Catalog | null>(null);
  readonly connection = signal<ConnectionStatus | null>(null);
  readonly search = signal('');
  readonly typeFilter = signal('');
  readonly visibilityFilter = signal('');
  readonly locationFilter = signal('');
  readonly roomEditor = signal<Room | null>(null);
  readonly locationEditor = signal<Location | null>(null);
  readonly editor = viewChild<ElementRef<HTMLDialogElement>>('editor');
  readonly confirmation = viewChild<ElementRef<HTMLDialogElement>>('confirmation');
  readonly pendingDelete = signal<{ kind: 'room' | 'location'; id: string; name: string } | null>(
    null,
  );
  readonly sections: { id: Section; label: string; icon: 'home' | 'rooms' | 'pin' | 'publish' }[] =
    [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'rooms', label: 'Rooms', icon: 'rooms' },
      { id: 'locations', label: 'Locations', icon: 'pin' },
    ];
  readonly types = ROOM_TYPES;
  password = '';
  readonly rooms = computed(() =>
    [...(this.catalog()?.rooms || [])].sort((a, b) => a.order - b.order),
  );
  readonly locations = computed(() =>
    [...(this.catalog()?.locations || [])].sort((a, b) => a.order - b.order),
  );
  readonly visibleCount = computed(() => this.catalog()?.snapshot?.rooms.length || 0);
  readonly featuredCount = computed(
    () => this.catalog()?.snapshot?.rooms.filter((room) => room.featured).length || 0,
  );
  readonly filteredRooms = computed(() =>
    this.rooms().filter((room) => {
      const query = this.search().trim().toLowerCase();
      return (
        (!query ||
          `${room.code} ${room.type} ${this.locationName(room.locationId)}`
            .toLowerCase()
            .includes(query)) &&
        (!this.typeFilter() || room.type === this.typeFilter()) &&
        (!this.locationFilter() || room.locationId === this.locationFilter()) &&
        (!this.visibilityFilter() ||
          this.publicationStatus('rooms', room.id) === this.visibilityFilter())
      );
    }),
  );
  constructor() {
    effect(() => {
      if (!this.api.authenticated()) {
        this.editor()?.nativeElement.close();
        this.confirmation()?.nativeElement.close();
        this.roomEditor.set(null);
        this.locationEditor.set(null);
        this.pendingDelete.set(null);
        this.catalog.set(null);
      }
    });
    void this.initialize();
  }
  private async initialize() {
    try {
      await this.api.restore();
      await this.load();
    } catch (error) {
      if (this.api.authenticated()) this.error.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  async login() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.login(this.password);
      this.password = '';
      await this.load();
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async logout() {
    this.busy.set(true);
    try {
      await this.api.logout();
      this.catalog.set(null);
      this.notice.set('');
      this.section.set('overview');
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async load() {
    this.error.set('');
    this.loading.set(true);
    try {
      const [catalog, status] = await Promise.all([this.api.catalog(), this.api.status()]);
      this.catalog.set(catalog);
      this.connection.set(status);
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  navigate(section: Section) {
    this.section.set(section);
    this.notice.set('');
    this.error.set('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  locationName(id: string) {
    return this.catalog()?.locations.find((location) => location.id === id)?.name || 'Not assigned';
  }
  openRoom(room?: Room) {
    this.editorError.set('');
    this.locationEditor.set(null);
    this.roomEditor.set(
      room
        ? structuredClone(room)
        : {
            id: crypto.randomUUID(),
            code: '',
            type: 'Common Room',
            monthlyRent: 0,
            locationId: '',
            description: '',
            features: ['Air conditioning', 'Shared bathroom'],
            photos: [],
            visible: false,
            featured: false,
            order: this.rooms().length,
          },
    );
    this.editor()?.nativeElement.showModal();
  }
  openLocation(location?: Location) {
    this.editorError.set('');
    this.roomEditor.set(null);
    this.locationEditor.set(
      location
        ? structuredClone(location)
        : {
            id: crypto.randomUUID(),
            name: '',
            journey: '',
            description: '',
            image: '',
            visible: true,
            order: this.locations().length,
          },
    );
    this.editor()?.nativeElement.showModal();
  }
  closeEditor() {
    if (this.busy()) return;
    if (!window.confirm('Discard unsaved changes and close the editor?')) return;
    this.dismissEditor();
  }
  private dismissEditor() {
    this.editor()?.nativeElement.close();
    this.roomEditor.set(null);
    this.locationEditor.set(null);
  }
  async saveRoom(room: Room) {
    const current = this.catalog();
    if (!current) return;
    const exists = current.rooms.some((item) => item.id === room.id);
    await this.save(
      {
        ...current,
        rooms: exists
          ? current.rooms.map((item) => (item.id === room.id ? room : item))
          : [...current.rooms, room],
      },
      'Room saved to your draft catalogue.',
    );
  }
  async saveLocation(location: Location) {
    const current = this.catalog();
    if (!current) return;
    const exists = current.locations.some((item) => item.id === location.id);
    await this.save(
      {
        ...current,
        locations: exists
          ? current.locations.map((item) => (item.id === location.id ? location : item))
          : [...current.locations, location],
      },
      'Location saved to your draft catalogue.',
    );
  }
  private async save(catalog: Catalog, message: string) {
    this.busy.set(true);
    this.error.set('');
    this.editorError.set('');
    try {
      this.catalog.set(await this.api.save(catalog));
      this.notice.set(message);
      this.dismissEditor();
      return true;
    } catch (error) {
      const message = (error as Error).message;
      this.error.set(message);
      this.editorError.set(message);
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  isPublished(kind: 'rooms' | 'locations', id: string) {
    return !!this.catalog()?.snapshot?.[kind].some((item) => item.id === id);
  }
  publicationStatus(kind: 'rooms' | 'locations', id: string) {
    const live = this.catalog()?.snapshot?.[kind].find((item) => item.id === id);
    if (!live) return 'Draft';
    const draft = this.catalog()?.[kind].find((item) => item.id === id);
    // Visibility is a legacy storage field. Publication is controlled by explicit actions.
    const content = (value: unknown) =>
      JSON.stringify(value, (key, item) => {
        if (key === 'visible') return undefined;
        if (item && typeof item === 'object' && !Array.isArray(item))
          return Object.fromEntries(
            Object.keys(item)
              .sort()
              .map((name) => [name, item[name]]),
          );
        return item;
      });
    return content(live) === content(draft) ? 'Published' : 'Unpublished changes';
  }
  askDelete(kind: 'room' | 'location', id: string, name: string) {
    this.error.set('');
    this.pendingDelete.set({ kind, id, name });
    this.confirmation()?.nativeElement.showModal();
  }
  cancelDelete() {
    if (this.busy()) return;
    this.confirmation()?.nativeElement.close();
    this.pendingDelete.set(null);
  }
  async remove() {
    const pending = this.pendingDelete();
    const current = this.catalog();
    if (!pending || !current) return;
    if (
      pending.kind === 'location' &&
      current.rooms.some((room) => room.locationId === pending.id)
    ) {
      this.error.set('Move the rooms assigned to this location before deleting it.');
      this.cancelDelete();
      return;
    }
    const next =
      pending.kind === 'room'
        ? { ...current, rooms: current.rooms.filter((room) => room.id !== pending.id) }
        : {
            ...current,
            locations: current.locations.filter((location) => location.id !== pending.id),
          };
    if (
      await this.save(
        next,
        `${pending.kind === 'room' ? 'Room' : 'Location'} deleted from the draft catalogue.`,
      )
    )
      this.cancelDelete();
  }
  async publishEntry(kind: 'rooms' | 'locations', id: string, publish: boolean) {
    if (!this.catalog()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.catalog.set(await this.api.publishEntry(kind, id, this.catalog()!.revision, publish));
      this.notice.set(
        publish
          ? 'Published. This entry is now available on the website.'
          : 'Unpublished. This entry has been removed from the website.',
      );
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  exportCatalog() {
    const blob = new Blob([JSON.stringify(this.catalog(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nest-and-nook-catalog.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.roomEditor() || this.locationEditor()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
