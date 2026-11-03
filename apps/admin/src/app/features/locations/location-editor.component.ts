import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'location-editor',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: ` <form (ngSubmit)="saved.emit(location())" class="editor-form">
    <div class="editor-heading">
      <div>
        <p class="eyebrow">LOCATION DETAILS</p>
        <h2>{{ location().name || 'A new location' }}</h2>
        <p>Help tenants find their neighbourhood.</p>
      </div>
      <button
        type="button"
        class="icon-button"
        [disabled]="saving()"
        aria-label="Close location editor"
        (click)="cancelled.emit()"
      >
        <admin-icon name="close" />
      </button>
    </div>
    <fieldset class="editor-fields" [disabled]="saving()">
      <label
        >Location name<input name="name" [(ngModel)]="location().name" required maxlength="100"
      /></label>
      <label
        >Journey to CIQ<input
          name="journey"
          [(ngModel)]="location().journey"
          maxlength="150"
          placeholder="e.g. 8-minute walk to CIQ"
      /></label>
      <label
        >Description<textarea
          name="description"
          [(ngModel)]="location().description"
          maxlength="2000"
          rows="5"
        ></textarea>
      </label>
      <label
        >Thumbnail URL<input
          name="image"
          [(ngModel)]="location().image"
          maxlength="2048"
          placeholder="https://… or /assets/…"
        /><small>Use a hosted HTTPS image URL or an existing image path.</small></label
      >
      @if (location().image) {
        <img class="location-preview" [src]="location().image" alt="Location thumbnail preview" />
      }
      <label
        >Display order<input
          name="order"
          type="number"
          [(ngModel)]="location().order"
          min="0"
          max="9999"
          required
      /></label>
    </fieldset>
    <div class="editor-footer">
      <button
        type="button"
        class="button secondary"
        [disabled]="saving()"
        (click)="cancelled.emit()"
      >
        Cancel</button
      ><button type="submit" class="button" [disabled]="saving()">
        <admin-icon name="check" />{{ saving() ? 'Saving…' : 'Save location' }}
      </button>
    </div>
  </form>`,
})
export class LocationEditorComponent {
  readonly location = input.required<Location>();
  readonly saving = input(false);
  readonly saved = output<Location>();
  readonly cancelled = output<void>();
}
