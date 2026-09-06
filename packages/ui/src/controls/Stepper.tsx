import type { ReactElement } from 'react';

import { formatCredits } from '../theme.js';

export interface StepperProps {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly caption?: string;
  readonly onChange: (value: number) => void;
  readonly disabled?: boolean;
}

/**
 * Numeric entry for bids and influence allocation. Thumb-driven by design:
 * a phone keyboard must never stand between a player and a 30-second
 * auction deadline.
 */
export const Stepper = ({
  value,
  min,
  max,
  step,
  caption,
  onChange,
  disabled = false
}: StepperProps): ReactElement => {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));

  return (
    <div className="eco-stepper">
      <button
        type="button"
        className="eco-stepper__btn"
        onClick={() => onChange(clamp(value - step))}
        disabled={disabled || value <= min}
        aria-label={`Decrease by ${step}`}
      >
        −
      </button>
      <div className="eco-stepper__value">
        <span className="eco-stepper__number">{formatCredits(value)}</span>
        {caption === undefined ? null : <span className="eco-label">{caption}</span>}
      </div>
      <button
        type="button"
        className="eco-stepper__btn"
        onClick={() => onChange(clamp(value + step))}
        disabled={disabled || value >= max}
        aria-label={`Increase by ${step}`}
      >
        +
      </button>
    </div>
  );
};
