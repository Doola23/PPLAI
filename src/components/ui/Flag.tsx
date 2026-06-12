import { getFlagSrc } from '../../utils/flags';

interface FlagProps {
  nationality: string;
  size?: number;
  className?: string;
}

export default function Flag({ nationality, size = 16, className = '' }: FlagProps) {
  const src = getFlagSrc(nationality);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={nationality}
      width={size}
      height={size}
      className={`inline-block object-contain shrink-0 ${className}`}
      style={{ width: size, height: size * 0.75, borderRadius: 2 }}
    />
  );
}
