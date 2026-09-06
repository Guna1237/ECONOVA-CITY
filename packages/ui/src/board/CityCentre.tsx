import type { CSSProperties, ReactElement } from 'react';

import { GAME_CONFIG } from '@econova/game-content';
import type { PublicProjectionDto } from '@econova/contracts';

import { Dice } from './Dice.js';
import { SeatPiece } from '../marks/Pieces.js';
import { CityEmblem, CitySkyline } from '../marks/Emblem.js';
import {
  DISTRICTS,
  DISTRICT_ORDER,
  PHASE_LABEL,
  STAGE_LABEL,
  seatOf
} from '../theme.js';

const NOTCHES = [-2, -1, 0, 1, 2] as const;

export interface CityCentreProps {
  readonly state: PublicProjectionDto;
  readonly rolling?: boolean;
}

/**
 * The city's control plate — the landmark at the middle of the board.
 *
 * Composed as one centred block (who the city is, how far through the game it
 * is, whose turn it is, and what is on the table) seated above the district
 * ledger, over a printed horizon. All of it public information.
 */
export const CityCentre = ({
  state,
  rolling = false
}: CityCentreProps): ReactElement => {
  const { turn, players, demand, round, phase } = state;
  const currentPlayer =
    turn === null
      ? null
      : players.find((player) => player.playerId === turn.playerId) ?? null;
  const seat =
    currentPlayer === null ? null : seatOf(currentPlayer.playerId, state.turnOrder);

  const stage =
    turn !== null && phase === 'player_turn'
      ? STAGE_LABEL[turn.stage] ?? ''
      : PHASE_LABEL[phase] ?? '';

  return (
    <div
      className="eco-centre"
      style={(seat === null ? {} : { '--seat': seat.color }) as CSSProperties}
    >
      {/* Printed scenery, behind everything, carrying no state. */}
      <CitySkyline className="eco-centre__skyline" />

      <div className="eco-centre__stack">
        <div className="eco-centre__masthead">
          <CityEmblem className="eco-centre__emblem" />
          <div className="eco-centre__titles">
            <span className="eco-centre__mark">Econova City</span>
            <span className="eco-centre__round">
              Round {round}
              <span>/ {GAME_CONFIG.rounds}</span>
            </span>
          </div>
        </div>

        <div className="eco-centre__present">
          <div className="eco-centre__now">
            {currentPlayer === null ? null : (
              <span className="eco-centre__turn">
                <span className="eco-rail__seat-dot" aria-hidden="true" />
                <span className="eco-centre__turn-name">{currentPlayer.name}</span>
              </span>
            )}
            <span className="eco-centre__stage">{stage}</span>
          </div>

          <div className="eco-centre__table">
            <div className="eco-centre__order" aria-label="Turn order">
              {state.turnOrder.map((playerId) => {
                const entry = players.find((player) => player.playerId === playerId);
                if (entry === undefined) return null;
                const playerSeat = seatOf(playerId, state.turnOrder);
                return (
                  <span
                    key={playerId}
                    className="eco-centre__order-seat"
                    data-active={turn?.playerId === playerId}
                    data-connected={entry.connected}
                    style={{ '--seat': playerSeat.color } as CSSProperties}
                    title={entry.name}
                  >
                    <SeatPiece shape={playerSeat.shape} />
                  </span>
                );
              })}
            </div>

            <span className="eco-centre__tray">
              <Dice value={turn?.roll ?? null} rolling={rolling} />
            </span>
          </div>
        </div>
      </div>

      <div className="eco-demand">
        {DISTRICT_ORDER.map((districtId) => {
          const district = DISTRICTS[districtId];
          const value = demand[districtId];
          return (
            <div
              key={districtId}
              className="eco-demand__district"
              style={district.vars as CSSProperties}
            >
              <span className="eco-demand__name">{district.label}</span>
              <span
                className="eco-demand__value"
                data-sign={value > 0 ? 'up' : value < 0 ? 'down' : 'flat'}
              >
                {value > 0 ? `+${value}` : value}
              </span>
              <span className="eco-demand__scale" aria-hidden="true">
                {NOTCHES.map((notch) => (
                  <span
                    key={notch}
                    className="eco-demand__notch"
                    data-on={
                      notch !== 0 &&
                      ((value > 0 && notch > 0 && notch <= value) ||
                        (value < 0 && notch < 0 && notch >= value))
                    }
                    data-zero={notch === 0 && value === 0}
                  />
                ))}
              </span>
              <span className="eco-visually-hidden">
                {district.label} demand {value > 0 ? `plus ${value}` : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
