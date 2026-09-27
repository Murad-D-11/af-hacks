'use client';

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const v =
    variant === 'primary'
      ? 'bg-orange text-plate shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] hover:bg-[#ff7038] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
      : variant === 'secondary'
        ? 'border border-line bg-plate-raised text-foreground shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] hover:border-orange/60 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
        : 'text-foreground/60 hover:text-orange';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all duration-100 disabled:opacity-40 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] ${v} ${className}`}
    >
      {children}
    </button>
  );
}
