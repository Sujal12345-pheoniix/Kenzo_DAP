/**
 * Localization Service.
 * Manages per-string translation records, RTL direction auto-detection,
 * machine translation fallback, and host app locale auto-sync.
 * @module core/localization
 */

export interface TranslationRecord {
  contentId: string;
  stepId?: string;
  field: 'title' | 'content' | 'buttonLabel';
  locale: string;
  text: string;
  isManualOverride?: boolean;
}

export class LocalizationService {
  private activeLocale: string = 'en';
  private translations: Map<string, string> = new Map();
  private rtlLocales = new Set(['ar', 'he', 'fa', 'ur']);

  constructor(defaultLocale = 'en') {
    this.activeLocale = defaultLocale;
  }

  setLocale(locale: string): void {
    this.activeLocale = locale.toLowerCase().split('-')[0];
  }

  getLocale(): string {
    return this.activeLocale;
  }

  isRtl(): boolean {
    return this.rtlLocales.has(this.activeLocale);
  }

  registerTranslations(records: TranslationRecord[]): void {
    for (const record of records) {
      const key = this.buildKey(record.contentId, record.stepId, record.field, record.locale);
      this.translations.set(key, record.text);
    }
  }

  translate(contentId: string, stepId: string | undefined, field: 'title' | 'content' | 'buttonLabel', fallbackText: string): string {
    const key = this.buildKey(contentId, stepId, field, this.activeLocale);
    if (this.translations.has(key)) {
      return this.translations.get(key)!;
    }
    return fallbackText;
  }

  private buildKey(contentId: string, stepId: string | undefined, field: string, locale: string): string {
    return `${contentId}:${stepId || 'global'}:${field}:${locale.toLowerCase()}`;
  }
}
