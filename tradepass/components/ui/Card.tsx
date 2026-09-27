const TONES = {
  plate: 'border border-line border-t-2 border-t-orange bg-plate shadow-plate',
  paper: 'border border-line bg-paper text-ink shadow-plate',
  flagged: 'border border-caution/40 border-t-2 border-t-caution bg-plate shadow-plate',
} as const;

export default function Card({
  children,
  className = '',
  tone = 'plate',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: keyof typeof TONES;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`p-5 transition-shadow duration-200 ${TONES[tone]} ${className}`} style={style}>
      {children}
    </div>
  );
}
