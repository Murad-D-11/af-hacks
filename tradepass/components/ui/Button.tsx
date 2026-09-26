'use client';
export default function Button({ children, onClick, variant = 'primary', disabled, className = '', type = 'button' }:
  { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; className?: string; type?: 'button' | 'submit' }) {
  const v = variant === 'primary' ? 'bg-emerald-600 text-white hover:bg-emerald-700'
    : variant === 'secondary' ? 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
    : 'text-slate-600 hover:text-slate-900';
  return <button type={type} onClick={onClick} disabled={disabled}
    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${v} ${className}`}>{children}</button>;
}
