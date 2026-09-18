import type { CSSProperties, ReactElement } from 'react';
import { BOARD_SPACES, GAME_CONFIG } from '@econova/game-content';
import type { PublicProjectionDto } from '@econova/contracts';
import { Dice } from './Dice.js';
import { SeatPiece } from '../marks/Pieces.js';
import { EconovaCrest } from '../marks/Crest.js';
import { NovaArt } from '../marks/NovaArt.js';
import { DistrictMark } from '../marks/Marks.js';
import { DISTRICTS, DISTRICT_ORDER, PHASE_LABEL, seatOf } from '../theme.js';

const TURN_ACTIVITY: Readonly<Record<string, string>> = {
  awaiting_roll: 'Ready to roll',
  awaiting_shortcut_choice: 'Choosing a direction',
  awaiting_property_decision: 'Buy or auction?',
  auction: 'Sealed auction',
  landing_fee_reaction: 'Paying a landing fee',
  emergency_sale: 'Choosing a property to sell',
  awaiting_event_choice: 'Choosing an event outcome',
  awaiting_card_discard: 'Choosing a card to discard',
  action_phase: 'Taking actions'
};

export interface CityCentreProps {
  readonly state: PublicProjectionDto;
  readonly rolling?: boolean;
}

/** Public context only. No decisions, prices, or outcomes are inferred here. */
export const CityCentre = ({ state, rolling = false }: CityCentreProps): ReactElement => {
  const { turn, players, phase } = state;
  // A paused game retains its turn internally, but must not look active.
  const active = phase === 'player_turn' && turn !== null;
  const current = active ? players.find((player) => player.playerId === turn.playerId) : undefined;
  const seat = current === undefined ? null : seatOf(current.playerId, state.turnOrder);
  const location = current === undefined ? null : BOARD_SPACES.find((space) => space.position === current.position);

  return (
    <div className="eco-board-hub" style={(seat === null ? {} : { '--seat': seat.color }) as CSSProperties}>
      <div className="eco-board-hub__brand">
        <EconovaCrest size={44} />
        <span className="eco-board-hub__wordmark">ECONOVA<span>CITY</span></span>
        <span className="eco-board-hub__round">Round <strong>{state.round}</strong><span> of {GAME_CONFIG.rounds}</span></span>
      </div>

      <div className="eco-board-hub__moment">
        <NovaArt kind="property" className="eco-board-hub__art" />
        <div className="eco-board-hub__turn" aria-live="polite" aria-atomic="true">
          <span className="eco-board-hub__caption">{active ? 'Current turn' : 'Game status'}</span>
          <strong className="eco-board-hub__player" title={current?.name}>{current?.name ?? PHASE_LABEL[phase] ?? 'Waiting'}</strong>
          <span className="eco-board-hub__activity">{active ? TURN_ACTIVITY[turn.stage] ?? 'Taking a turn' : phase === 'paused' ? 'Waiting for the operator to resume' : 'Follow the instructions on your phone'}</span>
          {location === null || location === undefined ? null : <span className="eco-board-hub__location">Space {location.position}: {location.name}</span>}
        </div>
        {active ? <div className="eco-board-hub__roll"><Dice value={turn.roll} rolling={rolling} /><span>{turn.roll === null ? 'Not rolled' : 'Dice roll'}</span></div> : null}
      </div>

      <div className="eco-board-hub__footer">
        <div className="eco-board-hub__order" aria-label="Turn order">
          {state.turnOrder.map((id) => {
            const player = players.find((entry) => entry.playerId === id);
            if (player === undefined) return null;
            const identity = seatOf(id, state.turnOrder);
            return <span key={id} className="eco-board-hub__seat" data-active={active && id === turn.playerId}
              style={{ '--seat': identity.color } as CSSProperties}
              title={`${player.name}${player.connected ? '' : ', disconnected'}`}>
              <SeatPiece shape={identity.shape} />
              <span>{identity.index + 1}</span>
              <span className="eco-visually-hidden">{player.name}{player.connected ? '' : ', disconnected'}</span>
            </span>;
          })}
        </div>
        <div className="eco-board-hub__market-title">District demand</div>
        <div className="eco-board-hub__market">
          {DISTRICT_ORDER.map((id) => {
            const district = DISTRICTS[id];
            const value = state.demand[id];
            return <div key={id} className="eco-board-hub__district" style={district.vars as CSSProperties}>
              <DistrictMark mark={district.mark} />
              <span>{district.label}</span>
              <strong key={value}>{value > 0 ? `+${value}` : value}</strong>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
};
