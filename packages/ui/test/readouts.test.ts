import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Timer } from '../src/controls/Readouts.js';

describe('authoritative deadline display', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each([[31000, '0.5'], [90000, '1'], [500, '0']])(
    'draws a bounded, compositor-only progress bar for deadline %i', (deadlineAt, fraction) => {
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      const html = renderToStaticMarkup(createElement(Timer, { deadlineAt, windowSeconds: 60 }));
      expect(html).toContain(`transform:scaleX(${fraction})`);
      expect(html).toContain('role="timer"');
    }
  );
});
