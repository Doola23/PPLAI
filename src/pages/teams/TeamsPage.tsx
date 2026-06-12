import { motion } from 'framer-motion';
import Navbar from '../../components/landing/Navbar';
import '../../styles/landing.css';

const E = [0.16, 1, 0.3, 1] as const;

const PL_TEAMS = [
  { name: 'Arsenal',           src: 'https://crests.football-data.org/57.png'   },
  { name: 'Aston Villa',       src: 'https://crests.football-data.org/58.png'   },
  { name: 'Bournemouth',       src: 'https://crests.football-data.org/1044.png' },
  { name: 'Brentford',         src: 'https://crests.football-data.org/402.png'  },
  { name: 'Brighton',          src: 'https://crests.football-data.org/397.png'  },
  { name: 'Chelsea',           src: 'https://crests.football-data.org/61.png'   },
  { name: 'Crystal Palace',    src: 'https://crests.football-data.org/354.png'  },
  { name: 'Everton',           src: 'https://crests.football-data.org/62.png'   },
  { name: 'Fulham',            src: 'https://crests.football-data.org/63.png'   },
  { name: 'Ipswich',           src: 'https://crests.football-data.org/349.png'  },
  { name: 'Leicester',         src: 'https://crests.football-data.org/338.png'  },
  { name: 'Liverpool',         src: 'https://crests.football-data.org/64.png'   },
  { name: 'Manchester City',   src: 'https://crests.football-data.org/65.png'   },
  { name: 'Manchester United', src: 'https://crests.football-data.org/66.png'   },
  { name: 'Newcastle',         src: 'https://crests.football-data.org/67.png'   },
  { name: "Nott'm Forest",     src: '/forest logo.png'  },
  { name: 'Southampton',       src: 'https://crests.football-data.org/340.png'  },
  { name: 'Tottenham',         src: 'https://crests.football-data.org/73.png'   },
  { name: 'West Ham',          src: 'https://crests.football-data.org/563.png'  },
  { name: 'Wolves',            src: 'https://crests.football-data.org/76.png'   },
];

export default function TeamsPage() {
  return (
    <div style={{ minHeight: '100dvh', background: '#000000', color: '#F2F2F2', overflowX: 'hidden' }}>
      <Navbar />

      <div style={{ textAlign: 'center', padding: '120px 24px 64px' }}>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: E }}
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#1A65D3', margin: '0 0 16px' }}
        >
          2024 / 25 Season
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: E, delay: 0.06 }}
          style={{
            fontSize: 'clamp(34px, 4.2vw, 52px)',
            fontWeight: 900, lineHeight: 0.9,
            letterSpacing: '-0.03em', textTransform: 'uppercase',
            color: '#F2F2F2', margin: 0,
          }}
        >
          Premier League
        </motion.h1>
      </div>

      <div style={{
        maxWidth: 1000, margin: '0 auto',
        padding: '0 40px 100px',
        display: 'flex', flexWrap: 'wrap',
        justifyContent: 'center', alignItems: 'center',
        gap: 48,
      }}>
        {PL_TEAMS.map((team, i) => (
          <motion.img
            key={team.name}
            src={team.src}
            alt={team.name}
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.55, ease: E, delay: 0.1 + i * 0.04 }}
            whileHover={{ scale: 1.15, filter: 'drop-shadow(0 0 18px rgba(26,101,211,0.45))' }}
            style={{
              width: 96, height: 96,
              objectFit: 'contain',
              cursor: 'default',
              filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.4))',
              transition: 'filter 220ms ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
