import type { CSSProperties, ReactElement } from 'react';

/** Pip layout by face, on a 3×3 grid read row-major. */
const FACES: Record<number, readonly number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9]
};

export interface DiceProps {
  /** The committed roll from the server, or null before one exists. */
  readonly value: number | null;
  readonly rolling?: boolean;
  /** Omit to let the surrounding surface size the die through CSS. */
  readonly size?: number;
}

/**
 * A physical die resting on the centre plate. It shows only the value the
 * server has committed; the tumble is a presentation of that result
 * arriving, never a stand-in for one.
 */
export const Dice = ({ value, rolling = false, size }: DiceProps): ReactElement => {
  const pips = value === null ? [] : (FACES[value] ?? []);

  return (
    <span
      className="eco-dice"
      data-rolling={rolling}
      data-settled={!rolling && value !== null}
      data-empty={value === null}
      style={(size === undefined ? {} : { '--die-size': `${size}px` }) as CSSProperties}
      role="img"
      aria-label={value === null ? 'No roll yet' : `Rolled ${value}`}
    >
      {value === null ? null : (
        <span className="eco-dice__pips" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) =>
            pips.includes(index + 1) ? (
              <span key={index} className="eco-dice__pip" />
            ) : (
              <span key={index} />
            )
          )}
        </span>
      )}
    </span>
  );
};
