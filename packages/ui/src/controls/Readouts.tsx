import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ReactElement } from 'react';

import { CreditsMark, InfluenceMark } from '../marks/Marks.js';
import { formatClock, formatCredits } from '../theme.js';

/* -----------------------------------------------------------------
 * Resources
 * -------------------------------------------------------------- */

export interface ResourceProps {
  readonly kind: 'credits' | 'influence';
  readonly value: number;
  readonly label?: boolean;
}

/**
 * Credits read as city treasury; Influence reads as political leverage.
 * A change is announced by the number itself moving, not by a badge.
 */
export const Resource = ({
  kind,
  value,
  label = true
}: ResourceProps): ReactElement => {
  const previous = useRef(value);
  const [delta, setDelta] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value === previous.current) return;
    setDelta(value > previous.current ? 'up' : 'down');
    previous.current = value;
    const timer = window.setTimeout(() => setDelta(null), 520);
    return () => window.clearTimeout(timer);
  }, [value]);

  const Mark = kind === 'credits' ? CreditsMark : InfluenceMark;
  const tone = kind === 'credits' ? 'var(--brass)' : 'var(--signal-note)';

  return (
    <div className="eco-resource" style={{ '--resource-tone': tone } as CSSProperties}>
      <span className="eco-resource__mark" aria-hidden="true">
        <Mark />
      </span>
      <span className="eco-resource__body">
        {label ? (
          <span className="eco-label">{kind === 'credits' ? 'Credits' : 'Influence'}</span>
        ) : null}
        <span className="eco-resource__value eco-num" data-delta={delta ?? undefined}>
          {formatCredits(value)}
        </span>
      </span>
    </div>
  );
};

/* -----------------------------------------------------------------
 * Timer
 * -------------------------------------------------------------- */

export interface TimerProps {
  /** Server deadline, epoch milliseconds. */
  readonly deadlineAt: number;
  /** Full window length in seconds, used to draw the drain. */
  readonly windowSeconds: number;
  readonly label?: string;
}

/**
 * A deadline the server set. Colour marks urgency but the count is always
 * legible on its own, so the state survives colour-vision deficiency and
 * reduced-motion alike.
 */
export const Timer = ({
  deadlineAt,
  windowSeconds,
  label
}: TimerProps): ReactElement => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, deadlineAt - now);
  const fraction = Math.max(0, Math.min(1, remaining / (windowSeconds * 1000)));
  const urgent = remaining <= 10_000;

  return (
    <div className="eco-timer" data-urgent={urgent}>
      {label === undefined ? null : <span className="eco-label">{label}</span>}
      <span className="eco-timer__track" aria-hidden="true">
        <span className="eco-timer__fill" style={{ width: `${fraction * 100}%` }} />
      </span>
      <span className="eco-timer__count" role="timer" aria-live="off">
        {formatClock(remaining)}
      </span>
    </div>
  );
};

/* -----------------------------------------------------------------
 * Connection
 * -------------------------------------------------------------- */

export type LinkState =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'offline'
  | 'error';

const LINK_LABEL: Record<LinkState, string> = {
  connected: 'Live',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  error: 'Link error'
};

export const ConnectionStatus = ({ state }: { state: LinkState }): ReactElement => (
  <span className="eco-link" data-state={state}>
    <span className="eco-link__dot" aria-hidden="true" />
    {LINK_LABEL[state]}
  </span>
);
