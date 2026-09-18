import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JoinRoom } from '../src/components/JoinRoom.js';

describe('player welcome', () => {
  const render = () => renderToStaticMarkup(createElement(JoinRoom, {
    onJoined: () => undefined, onDemonstration: () => undefined
  }));

  it('offers game instructions before a player joins', () => {
    expect(render()).toContain('How to play');
  });

  it('keeps the real publisher crest visible', () => {
    expect(render()).toContain('Econova Economics and Finance Club');
  });

  it('explains the objective without replacing the room form', () => {
    const html = render();
    expect(html).toContain('Build your city.');
    expect(html).toContain('Room code');
    expect(html).toContain('Your name');
    expect(html).toContain('highest score');
  });
});
