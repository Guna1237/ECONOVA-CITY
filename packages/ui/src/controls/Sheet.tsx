import { useEffect, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { CloseMark } from '../marks/Marks.js';

export interface SheetProps {
  readonly title: string;
  readonly kicker?: ReactNode;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/**
 * A focused surface that slides over the board on a phone and centres as a
 * dialog on larger screens. The board stays visible behind it — the player
 * never loses sight of the game state they are deciding about.
 */
export const Sheet = ({
  title,
  kicker,
  onClose,
  children,
  footer
}: SheetProps): ReactElement => {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="eco-scrim" onClick={onClose} />
      <div
        ref={panel}
        className="eco-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <span className="eco-sheet__grip" aria-hidden="true" />
        <header className="eco-sheet__head">
          <div>
            {kicker === undefined ? null : <div className="eco-label">{kicker}</div>}
            <h2 className="eco-sheet__title">{title}</h2>
          </div>
          <button
            type="button"
            className="eco-sheet__close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseMark width={20} height={20} />
          </button>
        </header>
        <div className="eco-sheet__body eco-scroll">{children}</div>
        {footer === undefined ? null : <div className="eco-sheet__foot">{footer}</div>}
      </div>
    </>
  );
};
