import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

/**
 * Where a command stands with the server. The UI never claims a result the
 * server has not committed, so these five values are the only ones a
 * control may display.
 */
export type RequestState =
  | 'idle'
  | 'submitting'
  | 'accepted'
  | 'committed'
  | 'rejected';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: 'default' | 'primary' | 'commit' | 'risk' | 'quiet';
  readonly size?: 'md' | 'sm';
  readonly block?: boolean;
  /** Right-aligned secondary detail, e.g. a cost. */
  readonly hint?: ReactNode;
  readonly request?: RequestState;
  /**
   * Why the action is unavailable. A natively disabled button swallows taps,
   * and a `title` tooltip never appears on a phone, so a player saw a grey
   * button with no explanation. With a reason and `onBlocked`, the button
   * stays disabled to assistive technology and never performs its action,
   * but a tap explains itself.
   */
  readonly blockedReason?: string | null;
  readonly onBlocked?: (reason: string) => void;
}

export const Button = ({
  tone = 'default',
  size = 'md',
  block = false,
  hint,
  request = 'idle',
  children,
  disabled,
  blockedReason,
  onBlocked,
  onClick,
  ...props
}: ButtonProps): ReactElement => {
  const unavailable = disabled === true || request === 'submitting';
  // Callers already describe the reason in `title`; it is used unless a
  // separate reason is given.
  const reason = blockedReason ?? (typeof props.title === 'string' ? props.title : undefined);
  const explains =
    unavailable &&
    request !== 'submitting' &&
    typeof reason === 'string' &&
    reason.length > 0 &&
    onBlocked !== undefined;

  return (
    <button
      type="button"
      className="eco-btn"
      data-tone={tone}
      data-size={size}
      data-block={block}
      data-request={request}
      disabled={unavailable && !explains}
      aria-disabled={explains ? true : undefined}
      aria-busy={request === 'submitting'}
      {...props}
      onClick={explains ? () => onBlocked(reason) : onClick}
    >
      <span>{children}</span>
      {hint !== undefined && request === 'idle' ? (
        <span className="eco-btn__hint">{hint}</span>
      ) : null}
    </button>
  );
};
