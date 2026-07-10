import { describe, expect, it } from 'vitest';

import { deepMerge } from '@/utils/deep-merge';
import { debounce } from '@/utils/debounce';
import { ContentSanitizer } from '@/utils/sanitizer';
import { SelectorEngine } from '@/dom/selector-engine';
import { ConditionEvaluator } from '@/core/conditions/condition-evaluator';
import { ConfigService } from '@/core/config/config.service';
import { Logger } from '@/core/logger/logger';

describe('deepMerge', () => {
  it('merges nested objects', () => {
    const result = deepMerge({ a: 1, nested: { x: 1, y: 2 } }, { b: 2, nested: { y: 3 } });
    expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 3 } });
  });
});

describe('ContentSanitizer', () => {
  const sanitizer = new ContentSanitizer();

  it('escapes HTML entities in text', () => {
    expect(sanitizer.escapeText('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
    );
  });

  it('removes script tags from HTML', () => {
    const result = sanitizer.sanitizeHtml('<p>Hello</p><script>evil()</script>');
    expect(result).not.toContain('<script');
    expect(result).toContain('Hello');
  });

  it('removes event handler attributes', () => {
    const result = sanitizer.sanitizeHtml('<span onclick="evil()">Click</span>');
    expect(result).not.toContain('onclick');
  });
});

describe('SelectorEngine', () => {
  const engine = new SelectorEngine();

  it('queries by CSS selector', () => {
    document.body.innerHTML = '<div id="test-target">Hello</div>';
    const results = engine.query({ css: '#test-target' });
    expect(results).toHaveLength(1);
    expect(results[0].textContent).toBe('Hello');
  });

  it('validates selector has at least one strategy', () => {
    expect(engine.isValid({ css: '#foo' })).toBe(true);
    expect(engine.isValid({})).toBe(false);
  });
});

describe('ConditionEvaluator', () => {
  const logger = new Logger();
  const config = new ConfigService(logger);
  config.init({ apiKey: 'test-key' });
  const evaluator = new ConditionEvaluator(config);

  it('matches URL contains rule', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://app.example.com/dashboard', pathname: '/dashboard' },
      writable: true,
    });

    expect(
      evaluator.evaluateUrlRules([{ type: 'contains', pattern: '/dashboard' }]),
    ).toBe(true);
  });

  it('returns true for empty rules', () => {
    expect(evaluator.evaluateUrlRules([])).toBe(true);
    expect(evaluator.evaluateConditions([])).toBe(true);
  });
});

describe('debounce', () => {
  it('delays function execution', async () => {
    let count = 0;
    const fn = debounce(() => {
      count++;
    }, 50);

    fn();
    fn();
    fn();
    expect(count).toBe(0);

    await new Promise((r) => setTimeout(r, 80));
    expect(count).toBe(1);
  });
});
