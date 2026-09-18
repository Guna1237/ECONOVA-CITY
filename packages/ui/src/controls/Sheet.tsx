import { useEffect, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { CloseMark } from '../marks/Marks.js';

export interface SheetProps {
  readonly title: string;
  readonly kicker?: ReactNode;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly dismissible?: boolean;
  readonly headerAction?: ReactNode;
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
  footer,
  headerAction,
  dismissible = true
}: SheetProps): ReactElement => {
  const panel = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = panel.current;
    if (dialog === null) return;
    const previous = document.activeElement;
    dialog.showModal();
    dialog.focus();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return (
      <dialog
        ref={panel}
        className="eco-sheet"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onCancel={(event) => {
          event.preventDefault();
          if (dismissible) onClose();
        }}
        onClick={(event) => {
          if (!dismissible || event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
        }}
      >
        <span className="eco-sheet__grip" aria-hidden="true" />
        <header className="eco-sheet__head">
          <div>
            {kicker === undefined ? null : <div className="eco-label">{kicker}</div>}
            <h2 className="eco-sheet__title">{title}</h2>
          </div>
          {headerAction === undefined ? null : <div className="eco-sheet__help">{headerAction}</div>}
          {dismissible ? <button
            type="button"
            className="eco-sheet__close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseMark width={20} height={20} />
          </button> : null}
        </header>
        <div className="eco-sheet__body eco-scroll">{children}</div>
        {footer === undefined ? null : <div className="eco-sheet__foot">{footer}</div>}
      </dialog>
  );
};
