import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BOARD_SPACES, GAME_CONFIG } from '@econova/game-content';
import { BOARD_HELP, BoardHelpContent, BoardHelp, boardHelpTitle, type BoardHelpTopic } from '../src/components/BoardHelp.js';
import { QuickStartGuide } from '../src/components/HowToPlay.js';

describe('first-time player instructions', () => {
  it('covers every canonical special space by its existing name', () => {
    for (const space of BOARD_SPACES) {
      if (space.type !== 'special') continue;
      expect(BOARD_HELP[space.specialId]).toBeDefined();
      expect(boardHelpTitle(space.specialId)).toBe(space.name);
    }
  });
  it.each(['innovation_hub', 'market_square', 'observatory'] as const)('%s explains an event without offering to trigger it', (topic) => {
    const html = renderToStaticMarkup(createElement(BoardHelpContent, { topic }));
    expect(html).toContain('random Special Event');
    expect(html).toContain('You must land here');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<form');
  });
  it('explains the City Center forward-only bonus and Shortcut exception', () => {
    const html = renderToStaticMarkup(createElement(BoardHelpContent, { topic: 'city_center' }));
    expect(html).toContain(`${GAME_CONFIG.cityCenterPassingBonus} Credits`);
    expect(html).toContain('at most once per turn');
    expect(html).toContain('Moving backward with Shortcut gives no bonus');
    expect(html).toContain('does not trigger a Special Event');
  });
  it('explains Council timing, choice, privacy and tie-break without inventing a board space', () => {
    const html = renderToStaticMarkup(createElement(BoardHelpContent, { topic: 'council' }));
    for (const text of ['start of Rounds 3 and 6', 'not a space you land on', '1 Influence is 1 vote', 'keep some Influence',
      `${GAME_CONFIG.councilTimerSeconds} seconds`, 'tie goes to Option A', 'private from other players']) expect(html).toContain(text);
  });
  it.each(Object.keys(BOARD_HELP) as BoardHelpTopic[])('%s help is dismissible and reminds players that timers continue', (topic) => {
    const html = renderToStaticMarkup(createElement(BoardHelp, { topic, onClose: () => undefined }));
    expect(html).toContain('Back to board');
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain('Reading help does not pause the game');
  });
  it('keeps the initial guide short and hides detailed rules until requested', () => {
    const html = renderToStaticMarkup(createElement(QuickStartGuide));
    const overview = html.split('<details>')[0]!.replace(/<[^>]*>/g, ' ');
    expect(overview.trim().split(/\s+/).length).toBeLessThan(130);
    expect(overview).toContain('1. Roll');
    expect(overview).toContain('2. Follow the prompt');
    expect(overview).toContain('3. Act, then end your turn');
    expect(html).not.toContain('<details open');
    expect(html).not.toContain('—');
  });
});
