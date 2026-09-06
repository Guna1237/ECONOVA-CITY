/*
 * ECONOVA: CITY — publisher identity.
 *
 * The crest is the Economics & Finance Club's own mark, bundled locally so
 * nothing is fetched at event time. It appears the way a publisher's mark
 * appears on a real game: on the board's edge, on the back of the card
 * stock, in the corner of the broadcast — present, never shouting.
 *
 * The game's own mark is the city emblem in Emblem.tsx; the two are
 * deliberately different jobs and are never used interchangeably.
 */

import type { ReactElement } from 'react';

import crestUrl from '../assets/econova-crest.png';

export interface CrestProps {
  readonly className?: string;
  /** Renders the wordmark beside the crest. */
  readonly withWordmark?: boolean;
  readonly size?: number;
}

export const EconovaCrest = ({
  className,
  withWordmark = false,
  size = 28
}: CrestProps): ReactElement => (
  <span className={`eco-crest${className === undefined ? '' : ` ${className}`}`}>
    <img
      src={crestUrl}
      alt="Econova Economics and Finance Club"
      width={size}
      height={size}
      className="eco-crest__mark"
    />
    {withWordmark ? (
      <span className="eco-crest__words">
        <span className="eco-crest__pub">An Econova game</span>
      </span>
    ) : null}
  </span>
);

export { crestUrl };
