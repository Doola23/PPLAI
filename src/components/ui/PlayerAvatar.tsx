import { useState, useEffect } from 'react';
import { getPlayerImage } from '../../utils/playerImages';

interface PlayerAvatarProps {
  name: string;
  playerId?: string | number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function transfermarktUrl(id: string | number) {
  return `https://img.a.transfermarkt.technology/portrait/medium/${id}.jpg?lm=1`;
}

function uiAvatarsUrl(name: string) {
  const encoded = encodeURIComponent(name.trim() || '?');
  return `https://ui-avatars.com/api/?name=${encoded}&background=1A65D3&color=F2F2F2&bold=true&format=png&size=128`;
}

function buildFallbacks(name: string, playerId?: string | number): string[] {
  const list: string[] = [];
  const fpl = getPlayerImage(name);
  if (fpl) list.push(fpl);
  if (playerId) list.push(transfermarktUrl(playerId));
  list.push(uiAvatarsUrl(name)); // always last — guaranteed to work
  return list;
}

export default function PlayerAvatar({ name, playerId, size = 40, className = '', style }: PlayerAvatarProps) {
  const [fallbacks, setFallbacks] = useState<string[]>(() => buildFallbacks(name, playerId));
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setFallbacks(buildFallbacks(name, playerId));
    setIdx(0);
  }, [name, playerId]);

  const src = fallbacks[idx];

  const handleError = () => {
    const next = idx + 1;
    if (next < fallbacks.length) setIdx(next);
  };

  const base: React.CSSProperties = {
    width: size, height: size,
    borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    ...style,
  };

  return (
    <div style={base} className={className}>
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        onError={handleError}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
      />
    </div>
  );
}
