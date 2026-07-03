import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonShared {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

interface ButtonAsButton extends ButtonShared {
  href?: never;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

interface ButtonAsLink extends ButtonShared {
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'border border-stone-700 text-stone-100 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'text-stone-400 hover:text-stone-100 disabled:opacity-50 disabled:cursor-not-allowed',
};

export default function Button({
  variant = 'primary',
  children,
  className = '',
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-950';
  const classes = `${base} ${variantStyles[variant]} ${className}`;

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
