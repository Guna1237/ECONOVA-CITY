import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NewsMoment } from '../src/components/NewsMoment.js';
import { ActivityCursor } from '../src/state/activity.js';
import { demonstrationPlayerState } from '../src/fixtures/demonstrationState.js';
import { seatOf, Timer } from '@econova/ui';

describe('phone activity and identity', () => {
  it('warns at 30 seconds elapsed, with 15 seconds remaining', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(29_999);
    const render = () => renderToStaticMarkup(createElement(Timer, { deadlineAt: 45_000, windowSeconds: 45, warningAfterSeconds: 30 }));
    try {
      expect(render()).toContain('data-urgent="false"');
      now.mockReturnValue(30_000);
      expect(render()).toContain('data-urgent="true"');
      expect(render()).toContain('>15</span>');
    } finally { now.mockRestore(); }
  });
  it('shows current news and policies immediately, without an overlay or timeout', () => {
    const html = renderToStaticMarkup(createElement(NewsMoment, { projection: demonstrationPlayerState }));
    expect(html).toContain('City updates');
    expect(html).toContain('Recent activity');
    expect(html).toContain('<details');
    expect(html).not.toContain('news-moment');
  });
  it('uses the server seat instead of rotating roster position', () => {
    const players = [{ playerId: 'a', seatIndex: 0 }, { playerId: 'b', seatIndex: 1 }];
    expect(seatOf('a', players)).toEqual(seatOf('a', [...players].reverse()));
    expect(seatOf('b', players).index).toBe(1);
  });
  it('does not replay history on initial connect, duplicate snapshots, stale snapshots, or a new game', () => {
    const cursor = new ActivityCursor();
    const item = { id: 'g:1:0', round: 1, title: 'Rent received', text: '20 Credits' };
    expect(cursor.receive('g', 1, [item])).toEqual([]);
    const next = { ...item, id: 'g:2:0' };
    expect(cursor.receive('g', 2, [item, next])).toEqual([next]);
    expect(cursor.receive('g', 2, [item, next])).toEqual([]);
    expect(cursor.receive('g', 1, [item])).toEqual([]);
    expect(cursor.receive('g', 3, [item, next])).toEqual([]);
    expect(cursor.receive('new-game', 1, [item])).toEqual([]);
  });
});
