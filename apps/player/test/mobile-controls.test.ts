import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionDock } from '../src/components/ActionDock.js';
import { SoundControl } from '../src/components/SoundControl.js';
import { PlayerSessionProvider } from '../src/state/PlayerSession.js';

const render = (child: ReturnType<typeof createElement>) => renderToStaticMarkup(
  createElement(PlayerSessionProvider, { session: null, onSignOut: () => {}, children: child })
);

describe('mobile control presentation', () => {
  it('keeps contextual help collapsed and provides a keyboard-accessible board link', () => {
    const html = render(createElement(ActionDock, {
      panel: null, wide: false, onPanel: () => {}, onInspectSpace: () => {},
      onTrade: () => {}, onInfluence: () => {}
    }));
    expect(html).toContain('id="player-actions" tabindex="-1"');
    expect(html).toContain('href="#city-board"');
    expect(html).toContain('<details class="player-brief__tip"><summary>Need a tip?</summary>');
    expect(html).toContain('player-dock__bar');
    expect(html).toContain('Dismiss this tip');
  });

  it('exposes sound settings without enabling audio or opening a panel on arrival', () => {
    const html = render(createElement(SoundControl));
    expect(html).toContain('aria-label="Sound settings, off"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('data-enabled="false"');
    expect(html).not.toContain('player-audio-settings');
  });
});
