import { Component, input } from '@angular/core';
const paths = {
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
  rooms: 'M3 18v3M21 18v3M3 18h18v-7H3v7ZM5 11V4h14v7M8 11V8h8v3',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  publish: 'M12 16V3m-5 5 5-5 5 5M4 14v7h16v-7',
  plus: 'M12 5v14M5 12h14',
  search: 'M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm5-2 6 6',
  arrow: 'M6 18 18 6M6 6h12v12',
  check: 'm5 12 4 4L19 6',
  edit: 'm14 5 5 5M4 20l5-1L21 7l-5-5L4 14v6Z',
  close: 'm6 6 12 12M6 18 18 6',
  logout: 'M9 3H3v18h6M9 12h12m-5-5 5 5-5 5',
  image: 'M3 3h18v18H3V3Zm0 13 6-6 12 11M16 7h.01',
  lock: 'M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4M12 14v3',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
};
@Component({
  selector: 'admin-icon',
  standalone: true,
  host: { 'aria-hidden': 'true' },
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path [attr.d]="paths[name()]" />
  </svg>`,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      svg {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class IconComponent {
  readonly name = input.required<keyof typeof paths>();
  readonly paths = paths;
}
