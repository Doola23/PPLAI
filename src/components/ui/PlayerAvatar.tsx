import { useState, useEffect } from 'react';
import { getPlayerImage } from '../../utils/playerImages';
import { getExtraPlayerImage } from '../../utils/extraPlayerImages';
import { getImageOverride } from '../../utils/playerImageOverrides';

interface PlayerAvatarProps {
  name: string;
  playerId?: string | number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function transfermarktUrl(id: string | number) {
  return `https://tmssl.akamaized.net/images/portrait/mid/${id}.jpg`;
}

function uiAvatarsUrl(name: string) {
  const encoded = encodeURIComponent(name.trim() || '?');
  return `https://ui-avatars.com/api/?name=${encoded}&background=1A65D3&color=F2F2F2&bold=true&format=png&size=128`;
}

function buildFallbacks(name: string, playerId?: string | number): string[] {
  const list: string[] = [];
  // Manual corrections win over everything. A blocked player goes straight to initials.
  const override = getImageOverride(name);
  if (override?.blocked) return [uiAvatarsUrl(name)];
  if (override?.url) list.push(override.url);
  // FotMob map first — it's an exact, team-verified per-player match. The FPL map
  // uses loose surname/substring matching, so a non-PL player (e.g. Isco) can be
  // falsely matched to a PL player's photo; keep it as a fallback only.
  const extra = getExtraPlayerImage(name);
  if (extra) list.push(extra);
  const fpl = getPlayerImage(name);
  if (fpl) list.push(fpl);
  // Transfermarkt CDN last-resort (its portrait endpoint is currently hotlink-blocked
  // and serves empty images, so it's only a maybe before the initials fallback).
  if (playerId) list.push(transfermarktUrl(playerId));
  list.push(uiAvatarsUrl(name));
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
  // ui-avatars is always the last fallback -- only it should get the blue base, so a real
  // photo (TM CDN or FPL) never shows blue behind/around it.
  const isInitialsFallback = idx === fallbacks.length - 1;

  const handleError = () => {
    const next = idx + 1;
    if (next < fallbacks.length) setIdx(next);
  };

  const base: React.CSSProperties = {
    width: size, height: size,
    borderRadius: '100%', overflow: 'hidden', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: isInitialsFallback ? '#1A65D3' : undefined,
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
        // TM/Wikimedia CDNs serve a 0-byte image when a Referer is present (hotlink
        // protection). Sending no referrer makes them return the real photo.
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 15%' }}
      />
    </div>
  );
}
