import { describe, expect, it } from 'vitest';
import { captureFingerprint, scoreMatch, resolveFingerprint } from './fingerprint';

describe('Element Fingerprinting & Resolution Engine', () => {
  it('captures composite fingerprint from a DOM element', () => {
    document.body.innerHTML = `
      <div id="wrapper">
        <button id="save-btn" class="btn btn-primary" data-testid="save-action" aria-label="Save changes">Save Form</button>
      </div>
    `;

    const btn = document.getElementById('save-btn')!;
    const fp = captureFingerprint(btn);

    expect(fp.tagName).toBe('button');
    expect(fp.id).toBe('save-btn');
    expect(fp.classList).toContain('btn');
    expect(fp.attributes['data-testid']).toBe('save-action');
    expect(fp.attributes['aria-label']).toBe('Save changes');
    expect(fp.textContent).toBe('Save Form');
    expect(fp.domPath.length).toBeGreaterThan(0);
  });

  it('scores match accurately and resolves element when classes change slightly', () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="save-btn" class="btn btn-secondary v2" data-testid="save-action" aria-label="Save changes">Save Form</button>
      </div>
    `;

    const originalFp = {
      tagName: 'button',
      id: 'save-btn',
      classList: ['btn', 'btn-primary'],
      attributes: { 'data-testid': 'save-action', 'aria-label': 'Save changes' },
      textContent: 'Save Form',
      domPath: [
        { tagName: 'button', nthOfType: 1, classList: ['btn', 'btn-primary'] },
        { tagName: 'div', nthOfType: 1, classList: [] },
      ],
      siblingIndex: 0,
      siblingCount: 1,
      boundingBoxRatio: { widthRatio: 0.1, heightRatio: 0.05 },
    };

    const res = resolveFingerprint(originalFp, document, 0.6);
    expect(res.element).not.toBeNull();
    expect(res.element?.id).toBe('save-btn');
    expect(res.confidence).toBeGreaterThan(0.7);
  });

  it('returns confidence below threshold when element is missing or drastically different', () => {
    document.body.innerHTML = `<div><p>Empty page</p></div>`;

    const originalFp = {
      tagName: 'button',
      id: 'non-existent',
      classList: ['btn'],
      attributes: { 'data-action': 'checkout' },
      textContent: 'Checkout Now',
      domPath: [],
      siblingIndex: 0,
      siblingCount: 1,
      boundingBoxRatio: { widthRatio: 0.1, heightRatio: 0.05 },
    };

    const res = resolveFingerprint(originalFp, document, 0.6);
    expect(res.element).toBeNull();
    expect(res.confidence).toBeLessThan(0.6);
  });
});
