import { BlurredInfiniteSlider } from '../ui/infinite-slider';

const CLUBS = [
  { name: 'Manchester City',    id: 65 },
  { name: 'Arsenal',            id: 57 },
  { name: 'Liverpool',          id: 64 },
  { name: 'Chelsea',            id: 61 },
  { name: 'Tottenham',          id: 73 },
  { name: 'Manchester United',  id: 66 },
  { name: 'Aston Villa',        id: 58 },
  { name: 'Newcastle',          id: 67 },
];

export default function LogoCloud() {
  return (
    <section style={{
      background: '#000000',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col items-center gap-6 md:flex-row md:gap-0">

          <div className="flex-shrink-0 text-center md:text-right md:w-52 md:border-r md:border-white/10 md:pr-6">
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
              Trusted by top
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#F2F2F2', marginTop: 3, lineHeight: 1.3 }}>
              Premier League clubs
            </p>
          </div>

          <div className="w-full md:flex-1">
            <BlurredInfiniteSlider speed={30} speedOnHover={10} gap={64} fadeWidth={80}>
              {CLUBS.map(({ name, id }) => (
                <div
                  key={id}
                  className="flex items-center justify-center"
                  style={{ width: 52, height: 52, flexShrink: 0 }}
                  title={name}
                >
                  <img
                    src={`https://crests.football-data.org/${id}.png`}
                    alt={name}
                    style={{ width: 44, height: 44, objectFit: 'contain' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                  />
                </div>
              ))}
            </BlurredInfiniteSlider>
          </div>

        </div>
      </div>
    </section>
  );
}
