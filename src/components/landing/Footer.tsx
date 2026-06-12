import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../ui/Logo';

const NAV_COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Match Predictions', to: '/features' },
      { label: 'Player Analytics', to: '/features' },
      { label: 'Scout Search', to: '/features' },
      { label: 'Injury Risk', to: '/features' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', scroll: 'about' },
      { label: 'Blog', scroll: 'blog' },
      { label: 'Careers', scroll: 'careers' },
      { label: 'Press', scroll: 'press' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', scroll: 'docs' },
      { label: 'API Reference', scroll: 'api' },
      { label: 'Status', scroll: 'status' },
      { label: 'Changelog', scroll: 'changelog' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', scroll: 'privacy' },
      { label: 'Terms of Service', scroll: 'terms' },
      { label: 'Contact', scroll: 'contact' },
    ],
  },
];

const SUGGESTIONS = [
  'How does PLAI help with opposition analysis?',
  'Can my physio team use the injury risk data?',
  'How do I build a scout shortlist for the manager?',
  'How quickly can the whole coaching staff get started?',
];

export default function Footer() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else navigate('/', { state: { scrollTo: id } });
  };

  const handleAsk = (q?: string) => {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setResponse('');
    setTimeout(() => {
      setLoading(false);
      setResponse(`PLAI uses a multi-model AI ensemble trained on 12M+ match datapoints across the Premier League. For "${text}" — get started to explore the full platform.`);
    }, 1200);
  };

  return (
    <footer className="lfooter2">

      <div className="lfooter2__chat-wrap">
        <label htmlFor="footer-chat-input" className="lfooter2__chat-label">Ask PLAI anything</label>
        <div className="lfooter2__chat-box">
          <input
            id="footer-chat-input"
            ref={inputRef}
            className="lfooter2__chat-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="Ask about predictions, scouting, analytics..."
          />
          <button
            className="lfooter2__chat-send"
            onClick={() => handleAsk()}
            disabled={loading}
            aria-label="Send"
          >
            {loading ? (
              <span className="lfooter2__spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>

        <AnimatePresence>
          {!response && (
            <motion.div
              className="lfooter2__suggestions"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {SUGGESTIONS.map(s => (
                <button key={s} className="lfooter2__chip" onClick={() => handleAsk(s)}>{s}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {response && (
            <motion.div
              className="lfooter2__response"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="lfooter2__response-dot" />
              {response}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="lfooter2__frame">
      <div className="lfooter2__grid">
        <div className="lfooter2__brand">
          <Logo height={20} style={{ marginBottom: 16 }} />
          <p className="lfooter2__tagline">Monday prep. Saturday win.</p>
          <div className="lfooter2__socials">
            <a className="lfooter2__social" href="https://x.com/plaianalytics" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a className="lfooter2__social" href="https://linkedin.com/company/plaianalytics" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.268 2.37 4.268 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a className="lfooter2__social" href="https://github.com/plaianalytics" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 008 10.95c.58.1.78-.25.78-.56v-2c-3.25.7-3.94-1.4-3.94-1.4-.53-1.35-1.3-1.7-1.3-1.7-1.07-.73.08-.72.08-.72 1.18.08 1.8 1.2 1.8 1.2 1.05 1.8 2.75 1.28 3.42.98.1-.76.4-1.28.75-1.57-2.6-.3-5.32-1.3-5.32-5.78 0-1.28.45-2.32 1.2-3.14-.12-.3-.52-1.5.1-3.12 0 0 .98-.3 3.2 1.2.92-.26 1.9-.4 2.88-.4.98 0 1.96.14 2.88.4 2.22-1.5 3.2-1.2 3.2-1.2.62 1.62.22 2.82.1 3.12.75.82 1.2 1.86 1.2 3.14 0 4.5-2.72 5.48-5.3 5.77.4.36.78 1.05.78 2.12v3.15c0 .3.2.66.78.55A11.5 11.5 0 0023.5 12C23.5 5.73 18.27.5 12 .5z"/></svg>
            </a>
          </div>
        </div>

        {NAV_COLS.map(col => (
          <div key={col.heading} className="lfooter2__col">
            <h3 className="lfooter2__col-heading">{col.heading}</h3>
            <ul>
              {col.links.map(link => (
                <li key={link.label}>
                  {'to' in link
                    ? <Link className="lfooter2__link" to={link.to!}>{link.label}</Link>
                    : <button className="lfooter2__link" onClick={() => scrollTo(link.scroll!)}>{link.label}</button>
                  }
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="lfooter2__bottom">
        <span>© 2026 PLAI Analytics. All rights reserved.</span>
        <span>Built for precision.</span>
      </div>
      </div>

    </footer>
  );
}
