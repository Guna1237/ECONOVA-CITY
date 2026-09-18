import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Sheet } from '../src/controls/Sheet.js';

describe('required decision dialog', () => {
  it('does not advertise a close action when the decision cannot be dismissed', () => {
    const html = renderToStaticMarkup(createElement(Sheet, {
      title: 'Your decision', onClose: () => undefined, dismissible: false,
      children: 'Choose an option'
    }));
    expect(html).not.toContain('aria-label="Close"');
    expect(html).toContain('Choose an option');
  });
});
