import { getClubCrest } from '../../utils/clubs';

interface ClubLogoProps {
  club: string;
  size?: number;
  className?: string;
}

export default function ClubLogo({ club, size = 20, className = '' }: ClubLogoProps) {
  const src = getClubCrest(club);
  if (!src) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 rounded-sm bg-white/10 text-[9px] font-bold text-white/40 ${className}`}
        style={{ width: size, height: size }}
      >
        {club.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={club}
      width={size}
      height={size}
      className={`inline-block object-contain shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
  );
}
