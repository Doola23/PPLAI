import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react';

const SPRING = { type: 'spring' as const, stiffness: 130, damping: 22 };

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.88);
}

interface Props {
  src: string;
  onConfirm: (dataUrl: string) => void;
  onClose: () => void;
}

export default function ImageCropModal({ src, onConfirm, onClose }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const dataUrl = await getCroppedBlob(src, croppedArea);
      onConfirm(dataUrl);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 12,
        }}
      >
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={SPRING}
        style={{
          width: 'min(480px, 100%)',
          background: '#0e0e0e', borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 17, fontWeight: 900, margin: 0, color: '#F2F2F2', letterSpacing: '-0.01em' }}>
            Crop photo
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'grid', placeItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', height: 340, background: '#111' }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: '#111' },
              cropAreaStyle: {
                border: '2px solid #1A65D3',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              },
            }}
          />
        </div>

        <div style={{ padding: '18px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MagnifyingGlassMinus size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <input
                type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#1A65D3', cursor: 'pointer' }}
              />
              <MagnifyingGlassPlus size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 14, textAlign: 'center' }}>↺</span>
              <input
                type="range" min={-180} max={180} step={1} value={rotation}
                onChange={e => setRotation(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#1A65D3', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 28 }}>{rotation}°</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#F2F2F2', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 999,
                background: '#1A65D3', border: 'none',
                color: '#F2F2F2', fontSize: 12, fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Check size={13} weight="bold" />
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </div>
      </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
