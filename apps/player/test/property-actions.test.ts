import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demonstrationPlayerState } from '../src/fixtures/demonstrationState.js';
import { PropertyPanel } from '../src/components/Panels.js';

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../src/state/PlayerSession.js', () => ({ usePlayerSession: () => session.current }));

describe('property action placement', () => {
  beforeEach(() => {
    const projection = structuredClone(demonstrationPlayerState);
    projection.self.quotes = { purchase: null, development: [{ propertyId: 'P01' as never, cost: 37 }] };
    session.current = { projection, can: (command: string) => command === 'develop_property', dispatch: vi.fn(), requestState: () => 'idle' };
  });

  const render = () => renderToStaticMarkup(createElement(PropertyPanel, { propertyId: 'P01', onClose: () => {} }));

  it('shows the authorized action and server price before secondary figures', () => {
    const html = render();
    expect(html).toContain('Available property actions');
    expect(html).toContain('37');
    expect(html.indexOf('Develop to level')).toBeLessThan(html.indexOf('Starting values'));
  });

  it('does not show an action when server capabilities do not allow it', () => {
    session.current.can = () => false;
    const html = render();
    expect(html).not.toContain('Available property actions');
    expect(html).toContain('Starting values');
  });
});
