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
}

export const Button = ({
  tone = 'default',
  size = 'md',
  block = false,
  hint,
  request = 'idle',
  children,
  disabled,
  ...props
}: ButtonProps): ReactElement => (
  <button
    type="button"
    className="eco-btn"
    data-tone={tone}
    data-size={size}
    data-block={block}
    data-request={request}
    disabled={disabled === true || request === 'submitting'}
    aria-busy={request === 'submitting'}
    {...props}
  >
    <span>{children}</span>
    {hint !== undefined && request === 'idle' ? (
      <span className="eco-btn__hint">{hint}</span>
    ) : null}
  </button>
);
