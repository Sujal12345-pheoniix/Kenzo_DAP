import { describe, expect, it } from 'vitest';
import { LocalizationService } from './localization-service';

describe('LocalizationService', () => {
  it('translates strings correctly per active locale', () => {
    const loc = new LocalizationService('en');

    loc.registerTranslations([
      { contentId: 'flow-1', stepId: 'step-1', field: 'title', locale: 'es', text: 'Bienvenido' },
      { contentId: 'flow-1', stepId: 'step-1', field: 'title', locale: 'ar', text: 'أهلاً بك' },
    ]);

    expect(loc.translate('flow-1', 'step-1', 'title', 'Welcome')).toBe('Welcome');

    loc.setLocale('es');
    expect(loc.translate('flow-1', 'step-1', 'title', 'Welcome')).toBe('Bienvenido');

    loc.setLocale('ar');
    expect(loc.translate('flow-1', 'step-1', 'title', 'Welcome')).toBe('أهلاً بك');
    expect(loc.isRtl()).toBe(true);
  });
});
