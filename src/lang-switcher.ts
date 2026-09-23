import { Component, inject } from '@angular/core';
import { I18nService, LANGS, Lang } from './i18n.service';
import { IconComponent } from './icon';

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [IconComponent],
  host: { 'class': 'lang-switcher' },
  template: `
    <app-icon name="globe" />
    <select
      [value]="i18n.lang()"
      (change)="onChange($event)"
      aria-label="Language"
    >
      @for (l of langs; track l.code) {
        <option [value]="l.code">{{ l.short }}</option>
      }
    </select>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #65717b;
      position: relative;
    }
    app-icon {
      color: #b58a36;
      width: 18px;
      height: 18px;
    }
    select {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: none;
      font-size: 13px;
      font-weight: 550;
      color: inherit;
      cursor: pointer;
      font-family: inherit;
      padding: 5px 16px 5px 2px;
      outline: none;
    }
    /* Custom dropdown arrow */
    :host::after {
      content: '';
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid currentColor;
      pointer-events: none;
    }
    :host:hover {
      color: #102c50;
    }
  `]
})
export class LangSwitcherComponent {
  readonly i18n = inject(I18nService);
  readonly langs = LANGS;

  onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Lang;
    this.i18n.setLang(value);
  }
}
