import { Injectable, signal } from '@angular/core';
import { TRANSLATIONS } from './i18n';

export type Lang = 'en' | 'zh' | 'ms';

export const LANGS: { code: Lang; short: string; label: string }[] = [
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'zh', short: '中文', label: '中文' },
  { code: 'ms', short: 'BM', label: 'Bahasa Melayu' }
];

const HTML_LANGS: Record<Lang, string> = { en: 'en-MY', zh: 'zh-MY', ms: 'ms-MY' };
const STORAGE_KEY = 'lang';

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh' || stored === 'ms') return stored;
  } catch { /* SSR or private mode */ }
  
  if (typeof navigator !== 'undefined' && navigator.language) {
    const sys = navigator.language.toLowerCase();
    if (sys.startsWith('zh')) return 'zh';
    if (sys.startsWith('ms') || sys.startsWith('id')) return 'ms';
  }

  return 'en';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(loadLang());

  constructor() {
    this.applyHtmlLang(this.lang());
  }

  /** Look up a translation key for the current language. Falls back to English, then to the raw key. */
  t(key: string): string {
    const l = this.lang();
    return TRANSLATIONS[l]?.[key] ?? TRANSLATIONS['en']?.[key] ?? key;
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    this.applyHtmlLang(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* SSR */ }
  }

  private applyHtmlLang(lang: Lang): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = HTML_LANGS[lang];
    }
  }
}
