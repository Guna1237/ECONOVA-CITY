import { useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { AlertMark, CloseMark } from '../marks/Marks.js';

/* -----------------------------------------------------------------
 * Events — three tiers so importance stays readable.
 *   minor      a line in the log
 *   important  a framed notice
 *   major      the city reacts; this interrupts
 * -------------------------------------------------------------- */

export type EventTier = 'minor' | 'important' | 'major';

export interface EventNoticeProps {
  readonly tier?: EventTier;
  readonly kicker: string;
  readonly headline: string;
  readonly body?: ReactNode;
  readonly action?: ReactNode;
}

export const EventNotice = ({
  tier = 'minor',
  kicker,
  headline,
  body,
  action
}: EventNoticeProps): ReactElement => (
  <div className="eco-event" data-tier={tier}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="eco-event__kicker">{kicker}</div>
      <div className="eco-event__headline">{headline}</div>
      {body === undefined ? null : <div className="eco-event__body">{body}</div>}
    </div>
    {action}
  </div>
);

/* -----------------------------------------------------------------
 * Round transition — short, then it gets out of the way.
 * -------------------------------------------------------------- */

export const RoundTransition = ({
  round,
  onDone
}: {
  readonly round: number;
  readonly onDone: () => void;
}): ReactElement => {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="eco-transition" role="status">
      <span className="eco-transition__round">Round {round}</span>
    </div>
  );
};

/* -----------------------------------------------------------------
 * Interruptions — link and lifecycle states that must not hide the board.
 * -------------------------------------------------------------- */

export const Interrupt = ({
  severity = 'notice',
  children,
  action
}: {
  readonly severity?: 'notice' | 'fatal';
  readonly children: ReactNode;
  readonly action?: ReactNode;
}): ReactElement => (
  <div className="eco-interrupt" data-severity={severity} role="status">
    <AlertMark width={18} height={18} style={{ flex: 'none' }} />
    <span style={{ flex: 1 }}>{children}</span>
    {action}
  </div>
);

/* -----------------------------------------------------------------
 * Toasts
 * -------------------------------------------------------------- */

export interface ToastItem {
  readonly id: string;
  readonly tone: 'info' | 'success' | 'warning' | 'error';
  readonly title: string;
  readonly text?: string;
}

export const Toasts = ({
  items,
  onDismiss
}: {
  readonly items: readonly ToastItem[];
  readonly onDismiss: (id: string) => void;
}): ReactElement | null => {
  if (items.length === 0) return null;
  return (
    <div className="eco-toasts" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className="eco-toast" data-tone={item.tone}>
          <span className="eco-toast__bar" aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eco-toast__title">{item.title}</div>
            {item.text === undefined ? null : (
              <div className="eco-toast__text">{item.text}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            aria-label="Dismiss"
            style={{ color: 'var(--ink-faint)' }}
          >
            <CloseMark width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
