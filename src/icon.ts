import { Component, input } from '@angular/core';

// Small, local SVG icons: no icon font, image requests or runtime dependency.
const PATHS = {
  star: ['m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.3-5.6-3-5.6 3 1-6.3L1.9 9.6l6.3-.9L12 3Z'],
  wifi: ['M2 8.8a16 16 0 0 1 20 0', 'M5 12a11 11 0 0 1 14 0', 'M8.5 15.3a5.5 5.5 0 0 1 7 0', 'M12 19h.01'],
  snowflake: ['M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7', 'm9 4 3 3 3-3m-6 16 3-3 3 3M3 10l4-1-1-4m15 9-4 1 1 4M6 19l1-4-4-1m15-9-1 4 4 1'],
  sparkle: ['m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z', 'M21 2v4m-2-2h4'],
  shield: ['M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z', 'm8 12 3 3 5-6'],
  washer: ['M4 3h16v18H4V3Z', 'M7 6h.01M10 6h.01M4 9h16', 'M16 15a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', 'M8 15c2-3 6 3 8 0'],
  wallet: ['M20 8V5H5a2 2 0 0 0 0 4h16v12H5a2 2 0 0 1-2-2V7', 'M21 13h-5v4h5M17 15h.01'],
  walk: ['M14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z', 'm7 21 4-7-1-6-4 4M10 8l5 5h4M11 14l5 7'],
  bus: ['M5 17h14V5c0-2-14-2-14 0v12ZM5 10h14M12 4v6M7 14h.01M17 14h.01M7 17v3M17 17v3'],
  bed: ['M3 18v3M21 18v3M3 18h18v-7H3v7ZM5 11V4h14v7M8 11V8h8v3'],
  home: ['m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8'],
  message: ['M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z', 'M8 9h8M8 13h5'],
  whatsapp: ['M3 21l1.65-4.95a9 9 0 1 1 3.3 3.3L3 21', 'M9 10a.5.5 0 0 0 1 0V8a.5.5 0 0 0-1 0v2a5 5 0 0 0 5 5h2a.5.5 0 0 0 0-1h-2a.5.5 0 0 0 0 1'],
  user: ['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 6 0 0 1 16 0v2'],
  pin: ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'],
  globe: ['M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20']
} as const;

@Component({
  selector: 'app-icon', standalone: true,
  host: { 'aria-hidden': 'true' },
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">@for (path of paths[name()]; track $index) {<path [attr.d]="path" />}</svg>`,
  styles: [':host{display:inline-flex;width:1.25em;height:1.25em;flex-shrink:0;vertical-align:middle}svg{display:block;width:100%;height:100%}']
})
export class IconComponent {
  readonly name = input.required<keyof typeof PATHS>();
  readonly paths = PATHS;
}
