import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PlayerId, PublicProjectionDto, RoomId } from '@econova/contracts';
import { BOARD_SPACES } from '@econova/game-content';
import { CityCentre } from '../src/board/CityCentre.js';
import { BoardSpace } from '../src/board/BoardSpace.js';
import { GameBoard } from '../src/board/GameBoard.js';

const id = 'board-player' as PlayerId;
const state: PublicProjectionDto = {
  gameId: 'board-test', roomId: 'BOARD1' as RoomId, stateVersion: 1,
  phase: 'player_turn', round: 3, turnOrder: [id], currentTurnIndex: 0,
  turn: { number: 1, playerId: id, stage: 'awaiting_roll', actionsRemaining: 2, roll: null, deadlineAt: 1234 },
  players: [{ playerId: id, name: 'A long player name', position: 0, propertyIds: [], connected: true }],
  properties: [], demand: { food: 1, tech: 2, entertainment: -1, mobility: 0 },
  activeBreakingNewsId: null, activePolicyIds: [], auction: null, council: null,
  emergencySale: null, tradePending: false, results: [], announcements: []
};
const render = (value = state) => renderToStaticMarkup(createElement(CityCentre, { state: value }));

describe('shared board presentation', () => {
  it('explains the current turn and location using public state', () => {
    const html = render();
    expect(html).toContain('A long player name');
    expect(html).toContain('Ready to roll');
    expect(html).toContain('City Center');
    expect(html).toContain('District demand');
    expect(html).toContain('No roll yet');
  });
  it('does not present a retained paused turn as active', () => {
    const html = render({ ...state, phase: 'paused' });
    expect(html).toContain('Waiting for the operator to resume');
    expect(html).not.toContain('Ready to roll');
    expect(html).not.toContain('data-active="true"');
    expect(html).not.toContain('eco-dice');
    const board = renderToStaticMarkup(createElement(GameBoard, { state: { ...state, phase: 'paused' } }));
    expect(board).not.toContain('data-active="true"');
    expect(board).not.toContain('data-active-space="true"');
  });
  it('renders only the authoritative roll, independent of movement distance', () => {
    expect(render({ ...state, turn: { ...state.turn!, roll: 6 } })).toContain('Rolled 6');
  });
  it('does not create inert buttons on the non-interactive projector', () => {
    const space = BOARD_SPACES.find((entry) => entry.type === 'property')!;
    const props = { space, ownerSeat: null, developmentLevel: 0 as const };
    expect(renderToStaticMarkup(createElement(BoardSpace, props))).not.toContain('<button');
    const interactive = renderToStaticMarkup(createElement(BoardSpace, { ...props, onSelect: () => undefined }));
    expect(interactive).toContain('<button');
    expect(interactive).toContain('aria-pressed="false"');
    expect(interactive).toContain('Base ');
  });
  it('uses the supplied icon art without importing its implied board-game rules', () => {
    const space = BOARD_SPACES.find((entry) => entry.type === 'special')!;
    const html = renderToStaticMarkup(createElement(BoardSpace, { space, ownerSeat: null, developmentLevel: 0 }));
    expect(html).toContain('nova-board-civic.webp');
    expect(html).toContain('City Center');
    expect(html).not.toContain('START HERE');
  });
});
