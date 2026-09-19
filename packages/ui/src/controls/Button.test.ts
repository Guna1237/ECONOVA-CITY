import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Button } from './Button.js';

const render = (props: Parameters<typeof Button>[0]): string =>
  renderToStaticMarkup(createElement(Button, props));

/**
 * A natively disabled button ignores taps and a `title` tooltip never shows on
 * a phone, so an unavailable action gave no reason at all. Opting in with
 * `onBlocked` keeps the button unavailable but lets a tap explain itself.
 */
describe('unavailable buttons', () => {
  it('stays natively disabled when it has nothing to explain', () => {
    const html = render({ disabled: true, title: 'No actions left', children: 'Trade' });
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('aria-disabled');
  });

  it('stays tappable but marked unavailable when it can explain why', () => {
    const html = render({
      disabled: true,
      title: 'No actions left',
      onBlocked: () => undefined,
      children: 'Trade'
    });
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('disabled=""');
  });

  it('is an ordinary button when it is available', () => {
    const html = render({ title: 'Trade', onBlocked: () => undefined, children: 'Trade' });
    expect(html).not.toContain('aria-disabled');
    expect(html).not.toContain('disabled=""');
  });

  it('never explains a request that is already being sent', () => {
    const html = render({
      request: 'submitting',
      title: 'Sending',
      onBlocked: () => undefined,
      children: 'Buy'
    });
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('aria-disabled');
  });
});
