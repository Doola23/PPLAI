/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'base':             '#000000',
        'celtic-blue':      '#1A65D3',
        'celtic-blue-dim':  'rgba(26,101,211,0.12)',
        'anti-flash':       '#F2F2F2',
        'spanish-gray':     '#939A9E',
        'slate-gray':       '#2B4C5E',
        'text-white':       '#F2F2F2',
        'text-light':       'rgba(242,242,242,0.85)',
        'text-gray':        '#939A9E',
        'text-dark-gray':   'rgba(242,242,242,0.28)',
        'border-dark':      'rgba(255,255,255,0.07)',
        'border-light':     'rgba(255,255,255,0.14)',
        'primary-accent':   '#1A65D3',
      },
      fontFamily: {
        sans: ['Aloevera Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['Miguer Sans', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1.4' }],
        'sm':   ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem',     { lineHeight: '1.6' }],
        'lg':   ['1.125rem', { lineHeight: '1.5' }],
        'xl':   ['1.5rem',   { lineHeight: '1.3' }],
        '2xl':  ['2rem',     { lineHeight: '1.2' }],
        '3xl':  ['2.5rem',   { lineHeight: '1.15' }],
        '4xl':  ['3.5rem',   { lineHeight: '1.1' }],
        '5xl':  ['4.5rem',   { lineHeight: '1.05' }],
        '6xl':  ['6rem',     { lineHeight: '1' }],
      },
      boxShadow: {
        'sm-dark':    '0 4px 12px rgba(0,0,0,0.4)',
        'md-dark':    '0 8px 24px rgba(0,0,0,0.5)',
        'lg-dark':    '0 16px 48px rgba(0,0,0,0.6)',
        'blue-glow':  '0 0 20px rgba(26,101,211,0.35)',
        'blue-glow-lg':'0 0 30px rgba(26,101,211,0.5)',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'float':       'float 4s ease-in-out infinite',
        'rotate-cw':   'rotateCW 20s linear infinite',
        'rotate-ccw':  'rotateCCW 30s linear infinite',
      },
    },
  },
  plugins: [],
};
