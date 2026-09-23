import { Component, inject } from '@angular/core';
import { I18nService, LANGS, Lang } from './i18n.service';

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  host: { 'class': 'lang-switcher', 'role': 'group', '[attr.aria-label]': "'Language'" },
  template: `
    @for (l of langs; track l.code) {
      <button
        type="button"
        [class.active]="i18n.lang() === l.code"
        (click)="i18n.setLang(l.code)"
        [attr.aria-pressed]="i18n.lang() === l.code"
        [attr.aria-label]="l.label"
      >{{ l.short }}</button>
    }
  `,
  styles: [`
    :host { display: flex; align-items: center; gap: 2px; }
    button {
      background: transparent; border: none; border-bottom: 2px solid transparent;
      padding: 5px 9px; font-size: 12px; font-weight: 550;
      color: #65717b; cursor: pointer; transition: color .2s, border-color .2s;
      font-family: inherit; letter-spacing: .3px;
    }
    button.active { color: #102c50; border-bottom-color: #b58a36; }
    button:hover { color: #102c50; }
  `]
})
export class LangSwitcherComponent {
  readonly i18n = inject(I18nService);
  readonly langs = LANGS;
}
