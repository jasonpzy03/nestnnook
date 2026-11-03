import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Location, Room, ROOM_TYPES } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'room-editor',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './room-editor.component.html',
})
export class RoomEditorComponent {
  readonly api = inject(ApiService);
  readonly room = input.required<Room>();
  readonly locations = input.required<Location[]>();
  readonly uploadsEnabled = input(false);
  readonly saving = input(false);
  readonly saved = output<Room>();
  readonly cancelled = output<void>();
  readonly types = ROOM_TYPES;
  feature = '';
  photoUrl = '';
  photoAlt = '';
  readonly error = signal('');
  readonly uploading = signal(false);
  addFeature() {
    const value = this.feature.trim();
    if (value && !this.room().features.includes(value) && this.room().features.length < 15)
      this.room().features.push(value);
    this.feature = '';
  }
  addPhoto() {
    if (!/^(https:\/\/[^\s]+|\/(assets|uploads)\/[^\s]+)$/.test(this.photoUrl)) {
      this.error.set('Enter an HTTPS image URL.');
      return;
    }
    if (this.room().photos.length >= 12) {
      this.error.set('You can add up to 12 photos.');
      return;
    }
    this.room().photos.push({ url: this.photoUrl, alt: this.photoAlt.trim() || this.room().type });
    this.photoUrl = '';
    this.photoAlt = '';
    this.error.set('');
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (this.room().photos.length >= 12) {
      this.error.set('You can add up to 12 photos.');
      input.value = '';
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    try {
      const photo = await this.api.upload(file);
      this.room().photos.push({ url: photo.url, alt: this.room().type });
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }
  movePhoto(index: number, direction: number) {
    const photos = this.room().photos;
    const other = index + direction;
    if (other >= 0 && other < photos.length)
      [photos[index], photos[other]] = [photos[other], photos[index]];
  }
  submit() {
    if (this.uploading() || this.saving()) return;

    this.saved.emit({
      ...this.room(),
      code: this.room().code.trim(),
      description: this.room().description.trim(),
    });
  }
}
