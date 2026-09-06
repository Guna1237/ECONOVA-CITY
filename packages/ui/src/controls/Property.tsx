import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { PROPERTY_BY_ID } from '@econova/game-content';

import { Development } from '../marks/Buildings.js';
import { DistrictMark } from '../marks/Marks.js';
import { PropertyMotif } from '../marks/Motifs.js';
import {
  DISTRICTS,
  TIER_LABEL,
  formatCredits,
  type SeatTheme
} from '../theme.js';

/* -----------------------------------------------------------------
 * Row — used in holdings lists, trade pickers and admin inspection.
 * -------------------------------------------------------------- */

export interface PropertyRecordProps {
  readonly propertyId: string;
  readonly ownerSeat?: SeatTheme | null;
  readonly ownerName?: string | null;
  readonly developmentLevel?: 0 | 1 | 2 | 3;
  readonly onSelect?: (propertyId: string) => void;
  readonly trailing?: ReactNode;
}

export const PropertyRecord = ({
  propertyId,
  ownerSeat = null,
  ownerName = null,
  developmentLevel = 0,
  onSelect,
  trailing
}: PropertyRecordProps): ReactElement | null => {
  const property = PROPERTY_BY_ID.get(propertyId);
  if (property === undefined) return null;
  const district = DISTRICTS[property.district];

  const inner = (
    <>
      <span className="eco-record__district" aria-hidden="true" />
      <span className="eco-record__motif" aria-hidden="true">
        <PropertyMotif propertyId={propertyId} />
      </span>
      <span className="eco-record__body">
        <span className="eco-record__name">{property.name}</span>
        <span className="eco-record__meta">
          <DistrictMark
            mark={district.mark}
            width={12}
            height={12}
            style={{ color: 'var(--district-lit)' }}
          />
          {district.label} · {TIER_LABEL[property.tier] ?? property.tier}
          {ownerName === null ? '' : ` · ${ownerName}`}
        </span>
      </span>
      {trailing ?? (
        <span className="eco-record__value">
          {developmentLevel > 0 ? (
            <span
              className="eco-development"
              aria-label={`Development level ${developmentLevel}`}
            >
              <Development district={property.district} level={developmentLevel} />
            </span>
          ) : (
            <span className="eco-label">Level 0</span>
          )}
        </span>
      )}
    </>
  );

  const style = {
    ...district.vars,
    ...(ownerSeat === null ? {} : { '--owner': ownerSeat.color })
  } as CSSProperties;

  if (onSelect === undefined) {
    return (
      <div className="eco-record" style={style}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="eco-record"
      style={style}
      onClick={() => onSelect(propertyId)}
    >
      {inner}
    </button>
  );
};

/* -----------------------------------------------------------------
 * Inspector body — the property record as printed on the board.
 *
 * These are the canonical printed values from the content package. The
 * amounts actually charged are resolved by the server against demand,
 * policies and events, so this panel never presents a computed total.
 * -------------------------------------------------------------- */

export interface PropertyInspectorProps {
  readonly propertyId: string;
  readonly ownerLabel: string;
  readonly ownerSeat?: SeatTheme | null;
  readonly developmentLevel: 0 | 1 | 2 | 3;
}

const Figure = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): ReactElement => (
  <div
    style={{
      padding: 'var(--s3)',
      borderRadius: 'var(--radius-plate)',
      background: 'var(--room-bg)',
      boxShadow: 'inset 0 0 0 1px var(--board-rule)'
    }}
  >
    <div className="eco-label">{label}</div>
    <div className="eco-num" style={{ fontSize: 'var(--type-lead)', marginTop: 2 }}>
      {value}
    </div>
  </div>
);

export const PropertyInspector = ({
  propertyId,
  ownerLabel,
  ownerSeat = null,
  developmentLevel
}: PropertyInspectorProps): ReactElement | null => {
  const property = PROPERTY_BY_ID.get(propertyId);
  if (property === undefined) return null;
  const district = DISTRICTS[property.district];
  const canDevelop = developmentLevel < 3;

  return (
    <div
      className="eco-decision"
      style={
        {
          ...district.vars,
          ...(ownerSeat === null ? {} : { '--owner': ownerSeat.color })
        } as CSSProperties
      }
    >
      <div className="eco-decision__subject">
        <DistrictMark
          mark={district.mark}
          width={28}
          height={28}
          style={{ color: 'var(--district-lit)', flex: 'none' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eco-label" style={{ color: 'var(--district-lit)' }}>
            {district.label} · {TIER_LABEL[property.tier] ?? property.tier}
          </div>
          <div style={{ fontWeight: 700 }}>{ownerLabel}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="eco-label">Development</div>
          <div className="eco-num" style={{ fontSize: 'var(--type-lead)' }}>
            {developmentLevel} / 3
          </div>
        </div>
      </div>

      <div>
        <div className="eco-label" style={{ marginBottom: 'var(--s2)' }}>
          Printed values
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--s2)'
          }}
        >
          <Figure label="Purchase price" value={formatCredits(property.basePrice)} />
          <Figure label="Base value" value={formatCredits(property.baseValue)} />
          <Figure label="Base income" value={formatCredits(property.baseIncome)} />
          <Figure label="Base landing fee" value={formatCredits(property.baseFee)} />
          <Figure
            label="Per development level"
            value={`+${property.developmentIncomeBonus} income · +${property.developmentFeeBonus} fee`}
          />
          <Figure
            label="Per demand step"
            value={`+${property.demandIncomeMultiplier} income · +${property.demandFeeMultiplier} fee`}
          />
        </div>
        <p
          style={{
            marginTop: 'var(--s3)',
            fontSize: 'var(--type-caption)',
            color: 'var(--ink-faint)'
          }}
        >
          Amounts charged are resolved by the city against current demand,
          policies and events.
        </p>
      </div>

      <div>
        <div className="eco-label" style={{ marginBottom: 'var(--s2)' }}>
          Development ladder
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          {property.developmentCosts.map((cost, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                padding: 'var(--s2)',
                borderRadius: 'var(--radius-plate)',
                textAlign: 'center',
                background:
                  developmentLevel > index ? 'var(--board-cell-lit)' : 'var(--room-bg)',
                boxShadow:
                  developmentLevel === index && canDevelop
                    ? 'inset 0 0 0 2px var(--brass)'
                    : 'inset 0 0 0 1px var(--board-rule)'
              }}
            >
              <div className="eco-label">Level {index + 1}</div>
              <div className="eco-num" style={{ marginTop: 2 }}>
                {formatCredits(cost)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
