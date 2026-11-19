import { useState, useEffect } from 'react';
import { getPlayerImage, getPlayerImageAsync } from '../../utils/playerImages';
import { getExtraPlayerImage } from '../../utils/extraPlayerImages';
import { getImageOverride } from '../../utils/playerImageOverrides';

interface PlayerAvatarProps {
  name: string;
  playerId?: string | number;
  src?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function transfermarktUrl(id: string | number) {
  return `https://tmssl.akamaized.net/images/portrait/mid/${id}.jpg`;
}

function buildFallbacks(name: string, playerId?: string | number, src?: string): string[] {
  const list: string[] = [];

  // Manual corrections win over everything. A blocked player goes straight to initials.
  const override = getImageOverride(name);
  if (override?.blocked) return [];
  if (override?.url) list.push(override.url);

  // Direct backend URL (e.g. from ScoutLab img_url) — most reliable for non-PL players
  if (src) list.push(src);

  // FotMob/extra map — exact, team-verified per-player match
  const extra = getExtraPlayerImage(name);
  if (extra) list.push(extra);

  // FPL map covers PL players
  const fpl = getPlayerImage(name);
  if (fpl) list.push(fpl);

  // Transfermarkt CDN last-resort (hotlink-blocked; referrerPolicy="no-referrer" helps)
  if (playerId) list.push(transfermarktUrl(playerId));

  return list;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function InlineAvatar({ name, size, borderRadius }: { name: string; size: number; borderRadius: string | number }) {
  const initials = getInitials(name);
  const fontSize = Math.max(9, Math.round(size * 0.31));
  const r = typeof borderRadius === 'number' ? borderRadius : parseFloat(borderRadius as string) || 0;

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width={size} height={size} rx={r} fill="#111316" />
      <line x1="0" y1={size * 0.65} x2={size * 0.65} y2="0" stroke="#1A65D3" strokeWidth="0.6" opacity="0.14" />
      <line x1={size * 0.25} y1={size} x2={size} y2={size * 0.25} stroke="#1A65D3" strokeWidth="0.6" opacity="0.09" />
      <rect width={size} height={size} rx={r} fill="none" stroke="#2B4C5E" strokeWidth="1" opacity="0.6" />
      <text
        x="50%" y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#939A9E"
        fontSize={fontSize}
        fontFamily="DM Sans, system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="0.03em"
      >
        {initials}
      </text>
    </svg>
  );
}

export default function PlayerAvatar({ name, playerId, src, size = 40, className = '', style }: PlayerAvatarProps) {
  const [fallbacks, setFallbacks] = useState<string[]>(() => buildFallbacks(name, playerId, src));
  const [idx, setIdx] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    const fb = buildFallbacks(name, playerId, src);
    setFallbacks(fb);
    setIdx(0);
    setExhausted(false);
    // If sync lookup found nothing, try async FPL cache
    if (!src && !playerId && fb.length === 0) {
      getPlayerImageAsync(name).then(url => {
        if (url) { setFallbacks([url]); setExhausted(false); }
      });
    }
  }, [name, playerId, src]);

  const handleError = () => {
    const next = idx + 1;
    if (next < fallbacks.length) setIdx(next);
    else setExhausted(true);
  };

  const br = style?.borderRadius ?? '50%';

  const base: React.CSSProperties = {
    width: size, height: size,
    borderRadius: br,
    overflow: 'hidden', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    ...style,
  };

  const showSvg = exhausted || fallbacks.length === 0;

  return (
    <div style={base} className={className}>
      {showSvg ? (
        <InlineAvatar name={name} size={size} borderRadius={br} />
      ) : (
        <img
          src={fallbacks[idx]}
          alt={name}
          width={size}
          height={size}
          onError={handleError}
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 15%' }}
        />
      )}
    </div>
  );
}
