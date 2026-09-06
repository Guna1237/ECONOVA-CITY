import type { CSSProperties, ReactElement } from 'react';

import { OBJECTIVE_BY_ID } from '@econova/game-content';
import { SeatPiece, formatCredits, seatOf } from '@econova/ui';

import { usePlayerSession } from '../state/PlayerSession.js';

/**
 * The payoff. Ranks first, then the components that produced each score, so
 * a player can see where the game was actually won. Every figure comes from
 * the server's score breakdown — nothing is recomputed here.
 */
export const FinalResults = (): ReactElement => {
  const { projection } = usePlayerSession();
  const { public: view, self } = projection;

  const ranked = [...view.results].sort((a, b) => a.rank - b.rank);
  const mine = ranked.find((result) => result.playerId === self.playerId) ?? null;

  return (
    <div className="results eco-scroll">
      <div className="results__inner">
        <div className="results__kicker eco-label">Final standings</div>
        <h1 className="results__title">
          {mine === null
            ? 'The city settles'
            : mine.rank === 1
              ? 'You built the city'
              : `You finished ${mine.rank}${mine.rank === 2 ? 'nd' : mine.rank === 3 ? 'rd' : 'th'}`}
        </h1>

        {ranked.map((result) => {
          const player = view.players.find(
            (entry) => entry.playerId === result.playerId
          );
          const seat = seatOf(result.playerId, view.turnOrder);
          const objective = OBJECTIVE_BY_ID.get(result.objectiveId);
          const you = result.playerId === self.playerId;

          return (
            <div
              key={result.playerId}
              className="results__row"
              data-rank={result.rank}
              data-you={you}
              style={{ '--seat': seat.color } as CSSProperties}
            >
              <span className="results__rank eco-num">{result.rank}</span>
              <SeatPiece shape={seat.shape} className="results__piece" />

              <div className="results__body">
                <div className="results__name">
                  {player?.name ?? '—'}
                  {you ? ' (you)' : ''}
                </div>
                <div className="results__breakdown">
                  <span>{formatCredits(result.breakdown.credits)} credits</span>
                  <span>{formatCredits(result.breakdown.propertyValue)} property</span>
                  <span>{formatCredits(result.breakdown.districtControl)} districts</span>
                  <span>{formatCredits(result.breakdown.influence)} influence</span>
                  {result.breakdown.fullDistrictControl > 0 ? (
                    <span>
                      {formatCredits(result.breakdown.fullDistrictControl)} full district
                    </span>
                  ) : null}
                  <span data-achieved={result.objectiveCompleted}>
                    {result.objectiveCompleted
                      ? `${objective?.name ?? 'Objective'} achieved · ${formatCredits(result.breakdown.objective)}`
                      : `${objective?.name ?? 'Objective'} missed`}
                  </span>
                </div>
              </div>

              <span className="results__total eco-num">
                {formatCredits(result.breakdown.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
