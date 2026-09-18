import { Fragment, type CSSProperties, type ReactElement, type ReactNode } from 'react';

import { PROPERTY_BY_ID, type BoardSpace as BoardSpaceContent } from '@econova/game-content';

import { Development } from '../marks/Buildings.js';
import { DistrictMark } from '../marks/Marks.js';
import { NovaArt, type NovaArtKind } from '../marks/NovaArt.js';
import { PropertyMotif } from '../marks/Motifs.js';
import {
  DISTRICTS,
  cellForPosition,
  formatCredits,
  type SeatTheme
} from '../theme.js';

const SPECIAL_NOTE: Record<string, string> = {
  city_center: 'Passing bonus',
  innovation_hub: 'Strategy card',
  market_square: 'Special event',
  observatory: 'Special event'
};

const SPECIAL_ART: Record<string, NovaArtKind> = {
  city_center: 'civic', innovation_hub: 'idea',
  market_square: 'market', observatory: 'event'
};

export interface BoardSpaceProps {
  readonly space: BoardSpaceContent;
  /** Null when unowned. Public information only. */
  readonly ownerSeat: SeatTheme | null;
  readonly developmentLevel: 0 | 1 | 2 | 3;
  readonly selected?: boolean;
  readonly destination?: boolean;
  readonly active?: boolean;
  readonly onSelect?: ((space: BoardSpaceContent) => void) | undefined;
  readonly children?: ReactNode;
}

/**
 * One printed space on the board. Property spaces carry district, name,
 * price, ownership and development; special spaces carry a mark and their
 * role. Both are printed regions of the same plate — never floating cards.
 */
export const BoardSpace = ({
  space,
  ownerSeat,
  developmentLevel,
  selected = false,
  destination = false,
  active = false,
  onSelect,
  children
}: BoardSpaceProps): ReactElement => {
  const cell = cellForPosition(space.position);
  const interactive = space.type === 'property' && onSelect !== undefined;
  const SpaceElement = interactive ? 'button' : 'div';

  const style = {
    gridRow: cell.row,
    gridColumn: cell.column,
    ...(ownerSeat === null ? {} : { '--owner': ownerSeat.color })
  } as CSSProperties;

  const shared = {
    className: 'eco-space',
    style,
    'data-edge': cell.edge,
    'data-position': space.position,
    'data-corner': (cell.row === 1 || cell.row === 6) && (cell.column === 1 || cell.column === 6),
    'data-kind': space.type,
    'data-owned': ownerSeat !== null,
    'data-selected': selected,
    'data-destination': destination,
    'data-active-space': active,
    'data-interactive': interactive
  } as const;

  if (space.type === 'special') {
    const art = SPECIAL_ART[space.specialId];
    return (
      <div {...shared}>
        <span className="eco-space__band" />
        <span className="eco-space__no" aria-hidden="true">{space.position}</span>
        <span className="eco-space__special">
          {art === undefined ? null : <NovaArt kind={art} />}
          <span className="eco-space__special-name">{space.name}</span>
          <span className="eco-space__special-note">
            {SPECIAL_NOTE[space.specialId] ?? ''}
          </span>
        </span>
        <span className="eco-space__pieces">{children}</span>
      </div>
    );
  }

  const property = PROPERTY_BY_ID.get(space.propertyId);
  if (property === undefined) {
    throw new Error(`Board space ${space.position} references unknown property.`);
  }
  const district = DISTRICTS[property.district];

  return (
    <SpaceElement
      {...shared}
      {...(interactive ? { type: 'button' as const } : {})}
      style={{ ...style, ...district.vars } as CSSProperties}
      onClick={interactive ? () => onSelect?.(space) : undefined}
      aria-pressed={interactive ? selected : undefined}
      title={property.name}
      aria-label={`${property.name}, ${district.label} district, ${
        ownerSeat === null ? 'unowned' : `owned by player ${ownerSeat.index + 1}`
      }, development level ${developmentLevel}`}
    >
      <span className="eco-space__band" />
      {ownerSeat === null ? null : (
        <>
          <span className="eco-space__owned-frame" aria-hidden="true" />
        </>
      )}
      <span className="eco-space__no" aria-hidden="true">{space.position}</span>

      <span className="eco-space__district" aria-hidden="true">
        <DistrictMark mark={district.mark} />
        <span>{district.label}</span>
      </span>

      <span className="eco-space__name">{property.name.split(/(?<=[a-z])(?=[A-Z])/u).map((part, index) => (
        <Fragment key={index}>{index === 0 ? null : <wbr />}{part}</Fragment>
      ))}</span>

      <PropertyMotif propertyId={property.id} className="eco-space__motif" />

      {developmentLevel > 0 ? (
        <Development
          key={`${property.id}-${developmentLevel}`}
          district={property.district}
          level={developmentLevel}
          className="eco-space__built"
        />
      ) : null}

      <span className="eco-space__foot">
        {ownerSeat === null ? (
          <span className="eco-space__price"><span>Base </span>{formatCredits(property.basePrice)}</span>
        ) : (
          <span className="eco-space__claim" aria-hidden="true">
            {ownerSeat.index + 1}
          </span>
        )}
      </span>

      <span className="eco-space__pieces">{children}</span>
    </SpaceElement>
  );
};
