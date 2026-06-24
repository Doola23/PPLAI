import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Target, Heartbeat, Trophy, Binoculars, ListBullets, ChartBar, User, SignOut, Gear, House, List, X, CaretDown } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

const PRODUCT_SECTIONS = [
  {
    section: 'Predictions',
    items: [
      { label: 'Match Predictions', desc: 'AI-driven fixture picks', icon: Target,      path: '/match-predictions' },
      { label: 'Table Predictions', desc: 'Season forecast model',  icon: Trophy,      path: '/table-predictions' },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { label: 'Injury Risk',    desc: 'Squad fitness radar',       icon: Heartbeat,   path: '/injury-risk'    },
      { label: 'Player Stats',   desc: 'Deep performance metrics',  icon: ChartBar,    path: '/player-stats'   },
    ],
  },
  {
    section: 'Scouting',
    items: [
      { label: 'Scout Search',  desc: 'Player discovery engine',   icon: Binoculars,  path: '/scout-search'  },
      { label: 'Scout Results', desc: 'Ranked candidate reports',  icon: ListBullets, path: '/scout-results' },
    ],
  },
];

const NAV_LINKS = [
  { label: 'Teams',     path: '/teams'    },
  { label: 'Support',   path: '/support'  },
  { label: 'Pricing',   path: '/pricing'  },
];

interface NavbarProps {
  showFeaturesDropdown?: boolean;
}

export default function Navbar({ showFeaturesDropdown = false }: NavbarProps) {
  const navRef        = useRef<HTMLElement>(null);
  const navigate      = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [productOpen,  setProductOpen]  = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [mobileProduct, setMobileProduct] = useState(false);

  const menuRef      = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);
  const productRef   = useRef<HTMLDivElement>(null);
  const productBtnRef = useRef<HTMLButtonElement>(null);

  const initials = (user?.name ?? '')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  useEffect(() => {
    if (productOpen && productBtnRef.current) {
      productBtnRef.current.getBoundingClientRect();
    }
  }, [productOpen]);

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) navRef.current.dataset.scrolled = String(window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setMenuOpen(false);

      if (
        productRef.current && !productRef.current.contains(e.target as Node) &&
        productBtnRef.current && !productBtnRef.current.contains(e.target as Node)
      ) setProductOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const mobileNav = (path: string) => {
    navigate(path);
    window.scrollTo(0, 0);
    closeMobile();
  };

  return (
    <>
      <header className="lnav" ref={navRef} id="nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <div className="lnav__inner">

          <button
            onClick={() => { navigate('/'); window.scrollTo(0, 0); }}
            aria-label="PLAI home"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 252.53 172.63" height="28" style={{ display: 'block' }} fill="#F2F2F2" aria-hidden="true">
              <path d="M242.81,19.3C234.18,7.03,221.02,0,206.71,0h-.14S0,.13,0,.13l68.75,45.73c9.36,6.22,20.07,9.51,30.98,9.52l79.77.02c4.87,0,9.35,2.45,12.3,6.73,3.08,4.47,3.96,10.32,2.36,15.65l-12.59,41.93,52.59-.04,16.43-54.71c4.25-15.92,1.42-32.57-7.79-45.65Z"/>
              <path d="M89.72,119h.15l81.26.47-77.52-46.75c-13.62-8.21-28.45-9.31-42.88-3.18-11.57,4.92-21.1,15.86-25.5,29.27l-15.34,46.75,43.53,27.08,11.87-35.91c3.51-10.6,13.32-17.73,24.43-17.73Z"/>
            </svg>
          </button>

          <nav className="lnav__links" aria-label="Primary">
            <div style={{ position: 'relative' }}>
              <button
                ref={productBtnRef}
                className="lnav__link"
                onMouseEnter={() => showFeaturesDropdown && setProductOpen(true)}
                onMouseLeave={(e) => {
                  if (!productRef.current?.contains(e.relatedTarget as Node)) setProductOpen(false);
                }}
                onClick={() => {
                  if (showFeaturesDropdown) setProductOpen(o => !o);
                  else { navigate('/features'); window.scrollTo(0, 0); }
                }}
                aria-haspopup={showFeaturesDropdown ? 'menu' : undefined}
                aria-expanded={showFeaturesDropdown ? productOpen : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Features
                {showFeaturesDropdown && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg" width="10" height="10"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ opacity: 0.5, transform: productOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                )}
              </button>

              <AnimatePresence>
                {showFeaturesDropdown && productOpen && (
                  <motion.div
                    ref={productRef}
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    onMouseEnter={() => setProductOpen(true)}
                    onMouseLeave={(e) => {
                      if (!productBtnRef.current?.contains(e.relatedTarget as Node)) setProductOpen(false);
                    }}
                    style={{
                      position: 'fixed', top: 60, left: 'calc(50vw - 390px)',
                      background: 'rgba(6,6,6,0.97)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 22,
                      padding: 24,
                      width: 780,
                      boxShadow: '0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      zIndex: 9999,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {PRODUCT_SECTIONS.map(({ section, items }) => (
                        <div key={section}>
                          <div style={{
                            fontSize: 10, fontWeight: 800, letterSpacing: '0.16em',
                            textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)',
                            padding: '0 12px 10px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            marginBottom: 8,
                          }}>
                            {section}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {items.map(({ label, desc, icon: Icon, path }) => (
                              <button
                                key={path}
                                onClick={() => { navigate(path); setProductOpen(false); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 14,
                                  padding: '12px 12px', borderRadius: 12,
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  textAlign: 'left', transition: 'background 130ms',
                                  fontFamily: 'inherit', width: '100%',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,101,211,0.1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              >
                                <div style={{
                                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                  background: 'rgba(26,101,211,0.12)',
                                  border: '1px solid rgba(26,101,211,0.2)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Icon size={16} color="#1A65D3" weight="fill" />
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F2F2F2', lineHeight: 1.3, whiteSpace: 'nowrap' }}>{label}</div>
                                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      marginTop: 12,
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 10px 0',
                    }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>All features available on Plus</span>
                      <button
                        onClick={() => { navigate('/pricing'); setProductOpen(false); }}
                        style={{
                          fontSize: 11, fontWeight: 700, color: '#1A65D3',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: 'inherit', letterSpacing: '0.02em',
                        }}
                      >
                        View pricing →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {NAV_LINKS.map(({ label, path }) => (
              <Link key={path} className="lnav__link" to={path}>{label}</Link>
            ))}
          </nav>

          <div className="lnav__actions">
            {!isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    padding: '8px 14px', borderRadius: 999,
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#F2F2F2', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                    cursor: 'pointer', transition: 'all 180ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  style={{
                    padding: '8px 16px', borderRadius: 999,
                    background: '#1A65D3', border: 'none',
                    color: '#F2F2F2', fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
                    cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,101,211,0.3)',
                    transition: 'all 180ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1453B0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1A65D3'; }}
                >
                  Get started
                </button>
              </div>
            )}

            {isAuthenticated && (
              <div style={{ position: 'relative' }}>
                <button
                  ref={triggerRef}
                  onMouseEnter={() => setMenuOpen(true)}
                  onMouseLeave={(e) => {
                    if (!menuRef.current?.contains(e.relatedTarget as Node)) setMenuOpen(false);
                  }}
                  onClick={() => setMenuOpen(o => !o)}
                  aria-label="User menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '4px 4px 4px 14px',
                    borderRadius: 999,
                    background: menuOpen ? 'rgba(26,101,211,0.14)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${menuOpen ? 'rgba(26,101,211,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer', transition: 'all 200ms', flexShrink: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F2F2F2', letterSpacing: '0.02em' }}>
                    {user?.name?.split(' ')[0] ?? 'Account'}
                  </span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#1A65D3',
                    display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 800, color: '#F2F2F2', letterSpacing: '0.04em',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
                  }}>{initials}</div>
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      ref={menuRef}
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      onMouseEnter={() => setMenuOpen(true)}
                      onMouseLeave={(e) => {
                        if (!triggerRef.current?.contains(e.relatedTarget as Node)) setMenuOpen(false);
                      }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                        background: 'rgba(8,8,8,0.97)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12, padding: 6, minWidth: 160,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
                        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        zIndex: 9999,
                      }}
                    >
                      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2' }}>{user?.name ?? 'Account'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user?.email}</div>
                      </div>
                      {[
                        { label: 'Dashboard',  path: '/dashboard', Icon: House },
                        { label: 'My Profile', path: '/account',   Icon: User  },
                        { label: 'Admin',      path: '/admin',     Icon: Gear  },
                      ].map(({ label, path, Icon }) => (
                        <button
                          key={label}
                          onClick={() => { navigate(path); window.scrollTo(0, 0); setMenuOpen(false); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 12px', borderRadius: 8,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#F2F2F2', fontSize: 13, fontWeight: 500,
                            fontFamily: 'inherit', textAlign: 'left', transition: 'background 150ms',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <Icon size={14} weight="regular" style={{ color: 'rgba(255,255,255,0.55)' }} />
                          {label}
                        </button>
                      ))}
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 8px' }} />
                      <button
                        onClick={async () => { await logout(); setMenuOpen(false); navigate('/'); }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px', borderRadius: 8,
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#ef4444', fontSize: 13, fontWeight: 600,
                          fontFamily: 'inherit', textAlign: 'left', transition: 'background 150ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <SignOut size={14} weight="bold" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <button
            className="lnav__hamburger"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="lmobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={closeMobile}
              aria-hidden="true"
            />
            <motion.div
              id="mobile-nav"
              className="lmobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
            >
              <div className="lmobile-drawer__header">
                <button
                  onClick={() => { navigate('/'); window.scrollTo(0, 0); closeMobile(); }}
                  aria-label="PLAI home"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 252.53 172.63" height="24" fill="#F2F2F2" aria-hidden="true">
                    <path d="M242.81,19.3C234.18,7.03,221.02,0,206.71,0h-.14S0,.13,0,.13l68.75,45.73c9.36,6.22,20.07,9.51,30.98,9.52l79.77.02c4.87,0,9.35,2.45,12.3,6.73,3.08,4.47,3.96,10.32,2.36,15.65l-12.59,41.93,52.59-.04,16.43-54.71c4.25-15.92,1.42-32.57-7.79-45.65Z"/>
                    <path d="M89.72,119h.15l81.26.47-77.52-46.75c-13.62-8.21-28.45-9.31-42.88-3.18-11.57,4.92-21.1,15.86-25.5,29.27l-15.34,46.75,43.53,27.08,11.87-35.91c3.51-10.6,13.32-17.73,24.43-17.73Z"/>
                  </svg>
                </button>
                <button
                  className="lmobile-drawer__close"
                  onClick={closeMobile}
                  aria-label="Close menu"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              <nav className="lmobile-drawer__nav" aria-label="Mobile navigation">
                <button
                  className="lmobile-drawer__product-btn"
                  onClick={() => setMobileProduct(o => !o)}
                  aria-expanded={mobileProduct}
                >
                  <span>Features</span>
                  <CaretDown
                    size={14}
                    weight="bold"
                    style={{
                      transition: 'transform 220ms',
                      transform: mobileProduct ? 'rotate(180deg)' : 'rotate(0deg)',
                      color: 'rgba(255,255,255,0.45)',
                    }}
                  />
                </button>

                <AnimatePresence>
                  {mobileProduct && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="lmobile-drawer__product-items">
                        {PRODUCT_SECTIONS.map(({ section, items }) => (
                          <div key={section} className="lmobile-drawer__product-group">
                            <div className="lmobile-drawer__product-label">{section}</div>
                            {items.map(({ label, icon: Icon, path }) => (
                              <button
                                key={path}
                                className="lmobile-drawer__product-item"
                                onClick={() => mobileNav(path)}
                              >
                                <div className="lmobile-drawer__product-icon">
                                  <Icon size={15} color="#1A65D3" weight="fill" />
                                </div>
                                {label}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {NAV_LINKS.map(({ label, path }) => (
                  <button
                    key={path}
                    className="lmobile-drawer__link"
                    onClick={() => mobileNav(path)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="lmobile-drawer__footer">
                {!isAuthenticated ? (
                  <>
                    <button
                      className="lmobile-drawer__signin"
                      onClick={() => mobileNav('/login')}
                    >
                      Sign in
                    </button>
                    <button
                      className="lmobile-drawer__cta"
                      onClick={() => mobileNav('/signup')}
                    >
                      Get started free
                    </button>
                  </>
                ) : (
                  <>
                    <div className="lmobile-drawer__user">
                      <div className="lmobile-drawer__avatar">{initials}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#F2F2F2' }}>{user?.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{user?.email}</div>
                      </div>
                    </div>
                    {[
                      { label: 'Dashboard',  path: '/dashboard', Icon: House },
                      { label: 'My Profile', path: '/account',   Icon: User  },
                      { label: 'Admin',      path: '/admin',     Icon: Gear  },
                    ].map(({ label, path, Icon }) => (
                      <button
                        key={label}
                        className="lmobile-drawer__link"
                        onClick={() => mobileNav(path)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                      >
                        <Icon size={15} style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
                        {label}
                      </button>
                    ))}
                    <button
                      className="lmobile-drawer__signout"
                      onClick={async () => { await logout(); closeMobile(); navigate('/'); }}
                    >
                      <SignOut size={15} weight="bold" />
                      Sign out
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
