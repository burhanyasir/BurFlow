import { describe, it, expect } from 'vitest';
import { t, detectLocale, LOCALES } from '../i18n';

describe('i18n', () => {
  it('returns English text by default', () => {
    expect(t('bubble.label')).toBe('Chat with us');
  });

  it('returns translated text for locales with translations', () => {
    expect(t('bubble.label', 'es')).toBe('Chatea con nosotros');
    expect(t('bubble.label', 'nl')).toBe('Chat met ons');
  });

  it('falls back to English for unknown locale', () => {
    expect(t('bubble.label', 'xx')).toBe('Chat with us');
  });

  it('falls back to English when locale is undefined', () => {
    expect(t('bubble.label', undefined)).toBe('Chat with us');
  });

  it('detectLocale returns config locale when valid', () => {
    expect(detectLocale('es')).toBe('es');
  });

  it('detectLocale falls back to en for invalid locale', () => {
    expect(detectLocale('invalid')).toBe('en');
  });

  it('detectLocale falls back to en when undefined', () => {
    expect(detectLocale(undefined)).toBe('en');
  });

  it('all 24 EU locales are in LOCALES', () => {
    expect(LOCALES).toHaveLength(24);
  });

  it('every key has an English translation', () => {
    const keys: string[] = [
      'bubble.label', 'bubble.aria', 'header.subtitle', 'header.close',
      'input.send', 'input.footer', 'preopen.status', 'preopen.prompt',
      'preopen.escape', 'handoff.instruction', 'handoff.email_placeholder',
      'handoff.submit', 'handoff.success', 'handoff.error', 'handoff.network_error',
      'takeover.banner_title', 'takeover.banner_desc', 'typing.thinking',
      'agent.label', 'error.unavailable', 'error.stream', 'welcome.title',
      'welcome.meta', 'welcome.recommended', 'welcome.escape', 'welcome.choose_path',
      'greeting.default', 'guidance.title', 'guidance.default_summary',
    ];
    for (const key of keys) {
      const val = t(key, 'en');
      expect(val).toBeTruthy();
      expect(val.length).toBeGreaterThan(0);
    }
  });
});
