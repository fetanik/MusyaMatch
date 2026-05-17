import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Heart,
  MapPin,
  LayoutDashboard,
  Gamepad2,
  Gift,
  Link2,
} from 'lucide-react';
import Layout from '../components/Layout';
import { useMessages } from '../components/MessagesContext';
import { useI18n } from '../i18n/I18nContext';
import { isLoggedInClient, isShelterManagerClient } from '../utils/clientSession';
import { apiUrl } from '../utils/apiUrl';
import '../styles/HomePage.css';

const NEEDS_API_BASE_URL = apiUrl('/api/needs');

const isOpenNeed = (need) => String(need?.status || 'open').toLowerCase() === 'open';

/** Shown when API is empty or unreachable so the carousel UI is still visible on the landing page. */
const getFallbackCarouselNeeds = (t) => [
  {
    id: 'demo-1',
    _carouselKey: 'demo-1',
    title: t('home.demoNeed1Title'),
    description: t('home.demoNeed1Desc'),
    priority: 'high',
    status: 'open',
    shelter: { name: t('home.demoShelterName'), address: t('home.demoShelterAddress') },
  },
  {
    id: 'demo-2',
    _carouselKey: 'demo-2',
    title: t('home.demoNeed2Title'),
    description: t('home.demoNeed2Desc'),
    priority: 'low',
    status: 'open',
    shelter: { name: t('home.demoShelterName'), address: t('home.demoShelterAddress') },
  },
  {
    id: 'demo-3',
    _carouselKey: 'demo-3',
    title: t('home.demoNeed3Title'),
    description: t('home.demoNeed3Desc'),
    priority: 'medium',
    status: 'open',
    shelter: { name: t('home.demoShelterName'), address: t('home.demoShelterAddress') },
  },
];

const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getNeedShelterInfo = (need, t) => {
  if (need?.shelter?.name || need?.shelter?.address) {
    return need.shelter;
  }

  const nameFromNeed =
    need?.shelterName ||
    need?.shelter_name ||
    need?.organizationName ||
    need?.organization_name;
  const addressFromNeed =
    need?.shelterAddress ||
    need?.shelter_address ||
    need?.address ||
    need?.location;
  if (nameFromNeed || addressFromNeed) {
    return {
      name: nameFromNeed || t('sNeeds.shelterFallback'),
      address: addressFromNeed || '',
    };
  }
  return null;
};

const HomePage = () => {
  const navigate = useNavigate();
  const { notify } = useMessages();
  const { t } = useI18n();
  const greyIconStyle = { background: '#f1f2f6', color: '#2d3436' };
  const isManager = isShelterManagerClient();

  const [needs, setNeeds] = useState([]);
  const carouselRef = useRef(null);
  const [showCarouselLeft, setShowCarouselLeft] = useState(false);
  const [showCarouselRight, setShowCarouselRight] = useState(false);
  const SCROLL_EDGE_EPS = 3;

  const updateCarouselArrows = useCallback(() => {
    const el = carouselRef.current;
    if (!el) {
      setShowCarouselLeft(false);
      setShowCarouselRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    const overflow = maxScroll > SCROLL_EDGE_EPS;
    if (!overflow) {
      setShowCarouselLeft(false);
      setShowCarouselRight(false);
      return;
    }
    setShowCarouselLeft(scrollLeft > SCROLL_EDGE_EPS);
    setShowCarouselRight(scrollLeft < maxScroll - SCROLL_EDGE_EPS);
  }, []);

  const notifyAccountRequired = useCallback(() => {
    void notify(t('home.notifyText'), {
      type: 'info',
      title: t('home.notifyTitle'),
      autoCloseMs: 5000,
      onOk: () => navigate('/register'),
    });
  }, [navigate, notify, t]);

  const guardedNavigate = useCallback(
    (path) => {
      if (!isLoggedInClient()) {
        notifyAccountRequired();
        return;
      }
      navigate(path);
    },
    [navigate, notifyAccountRequired],
  );

  const onProtectedLinkClick = useCallback(
    (event) => {
      if (!isLoggedInClient()) {
        event.preventDefault();
        notifyAccountRequired();
      }
    },
    [notifyAccountRequired],
  );

  useEffect(() => {
    const fetchShelterByUserId = async (userId) => {
      if (!toPositiveInt(userId)) return null;
      const response = await fetch(apiUrl(`/api/shelter/profile/${userId}`));
      if (!response.ok) return null;
      const profile = await response.json().catch(() => null);
      if (!profile) return null;
      return {
        id: profile.shelterId || null,
        name: profile.name || profile.shelterName || '',
        address: profile.address || '',
        phone: profile.phone || '',
      };
    };

    const enrichNeedsWithShelter = async (items) => {
      const cache = new Map();
      return Promise.all(
        items.map(async (need) => {
          if (need?.shelter?.name || need?.shelter?.address) return need;
          const ownerUserId = toPositiveInt(need?.userId ?? need?.user_id);
          if (!ownerUserId) return need;
          if (!cache.has(ownerUserId)) {
            cache.set(ownerUserId, fetchShelterByUserId(ownerUserId));
          }
          const shelter = await cache.get(ownerUserId);
          return shelter ? { ...need, shelter } : need;
        }),
      );
    };

    const loadNeeds = async () => {
      try {
        const response = await fetch(NEEDS_API_BASE_URL);
        if (!response.ok) {
          throw new Error('Failed to load needs');
        }

        const data = await response.json();
        let realNeeds = (Array.isArray(data) ? data : [])
          .filter(isOpenNeed)
          .map((need) => ({ ...need, _carouselKey: `real-${need.id}` }));

        realNeeds = await enrichNeedsWithShelter(realNeeds);
        setNeeds(realNeeds.length > 0 ? realNeeds : getFallbackCarouselNeeds(t));
      } catch (error) {
        console.error('Failed to load needs:', error);
        setNeeds(getFallbackCarouselNeeds(t));
      }
    };

    loadNeeds();
  }, [t]);

  useLayoutEffect(() => {
    updateCarouselArrows();
  }, [needs, updateCarouselArrows]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return undefined;
    updateCarouselArrows();
    el.addEventListener('scroll', updateCarouselArrows, { passive: true });
    el.addEventListener('scrollend', updateCarouselArrows);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCarouselArrows) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateCarouselArrows);
    return () => {
      el.removeEventListener('scroll', updateCarouselArrows);
      el.removeEventListener('scrollend', updateCarouselArrows);
      ro?.disconnect();
      window.removeEventListener('resize', updateCarouselArrows);
    };
  }, [needs, updateCarouselArrows]);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Layout showGuestAuthActions showLanguageSwitcher>
      <div className="content-container">
        <section className="hero">
          <div className="hero-avatar" aria-hidden>
            🐱
          </div>
          <h2>
            {t('home.heroLine1')} <span>{t('home.heroBrand')}</span>
          </h2>
          <p className="hero-subtitle">{t('home.heroSubtitle')}</p>
        </section>

        <section className="grid-cards" aria-label={t('home.highlightsAria')}>
          <div
            className="action-card-info action-card-info--interactive"
            role="button"
            tabIndex={0}
            onClick={() => guardedNavigate('/chat')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                guardedNavigate('/chat');
              }
            }}
          >
            <div className="icon-box">
              <Sparkles size={24} />
            </div>
            <h3>{t('home.cardAiTitle')}</h3>
            <p>{t('home.cardAiDesc')}</p>
          </div>

          {!isManager && (
            <div
              className="action-card-info action-card-info--interactive"
              role="button"
              tabIndex={0}
              onClick={() => guardedNavigate('/marketplace')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  guardedNavigate('/marketplace');
                }
              }}
            >
              <div className="icon-box">
                <Gift size={24} />
              </div>
              <h3>{t('home.cardDealsTitle')}</h3>
              <p>{t('home.cardDealsDesc')}</p>
            </div>
          )}

          <div
            className="action-card-info action-card-info--interactive"
            role="button"
            tabIndex={0}
            onClick={() => guardedNavigate('/calendar')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                guardedNavigate('/calendar');
              }
            }}
          >
            <div className="icon-box">
              <Calendar size={24} />
            </div>
            <h3>{t('home.cardHealthTitle')}</h3>
            <p>{t('home.cardHealthDesc')}</p>
          </div>

          <div
            className="action-card-info action-card-info--interactive"
            role="button"
            tabIndex={0}
            onClick={() => guardedNavigate('/gallery')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                guardedNavigate('/gallery');
              }
            }}
          >
            <div className="icon-box">
              <Heart size={24} />
            </div>
            <h3>{t('home.cardFosterTitle')}</h3>
            <p>{t('home.cardFosterDesc')}</p>
          </div>

          <div
            className="action-card-info action-card-info--interactive"
            role="button"
            tabIndex={0}
            onClick={() => guardedNavigate('/pharmacies')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                guardedNavigate('/pharmacies');
              }
            }}
          >
            <div className="icon-box">
              <MapPin size={24} />
            </div>
            <h3>{t('home.cardVetTitle')}</h3>
            <p>{t('home.cardVetDesc')}</p>
          </div>
        </section>

        <button type="button" className="btn-main" onClick={() => navigate('/register')}>
          {t('home.getStarted')}
        </button>

        <div className="btn-secondary-group">
          <button type="button" className="btn-outline" onClick={() => guardedNavigate('/chat')}>
            {t('home.chatAi')}
          </button>
          <button type="button" className="btn-outline" onClick={() => guardedNavigate('/pharmacies')}>
            <Link2 size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} aria-hidden />
            {t('home.pharmacies')}
          </button>
        </div>

        <Link
          to="/gallery"
          className="btn-outline btn-outline-block"
          style={{ marginTop: '10px' }}
          onClick={onProtectedLinkClick}
        >
          {t('home.browseCats')}
        </Link>

        <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '20px' }}>{t('home.freeNote')}</p>

        <section className="features-section" aria-labelledby="features-heading">
          <h3 id="features-heading">{t('home.featuresHeading')}</h3>

          <div className="feature-cards">
            <button
              type="button"
              className="feature-card feature-card--click"
              onClick={() => guardedNavigate('/calendar')}
            >
              <div className="icon-box grey" style={greyIconStyle}>
                <LayoutDashboard size={24} />
              </div>
              <div className="feature-card-text">
                <h4>{t('home.featureHealthTitle')}</h4>
                <p>{t('home.featureHealthDesc')}</p>
              </div>
            </button>

            {!isManager && (
              <button
                type="button"
                className="feature-card feature-card--click"
                onClick={() => guardedNavigate('/marketplace')}
              >
                <div className="icon-box grey" style={greyIconStyle}>
                  <Sparkles size={24} />
                </div>
                <div className="feature-card-text">
                  <h4>{t('home.featureMarketTitle')}</h4>
                  <p>{t('home.featureMarketDesc')}</p>
                </div>
              </button>
            )}

            <button
              type="button"
              className="feature-card feature-card--click"
              onClick={() => guardedNavigate('/achievements')}
            >
              <div className="icon-box grey" style={greyIconStyle}>
                <Gamepad2 size={24} />
              </div>
              <div className="feature-card-text">
                <h4>{t('home.featureGameTitle')}</h4>
                <p>{t('home.featureGameDesc')}</p>
              </div>
            </button>

            <button
              type="button"
              className="feature-card feature-card--click"
              onClick={() => guardedNavigate('/pharmacies')}
            >
              <div className="icon-box grey" style={greyIconStyle}>
                <MapPin size={24} />
              </div>
              <div className="feature-card-text">
                <h4>{t('home.featureMapTitle')}</h4>
                <p>{t('home.featureMapDesc')}</p>
              </div>
            </button>
          </div>
        </section>

        {needs.length > 0 && (
          <section className="shelter-needs-carousel-section" aria-labelledby="home-needs-carousel-heading">
            <div className="carousel-header">
              <h3 id="home-needs-carousel-heading">{t('db.carouselTitle')}</h3>
              <Link to="/shelter-needs" className="view-all-link">
                {t('db.viewAll')}
              </Link>
            </div>

            <div className="carousel-shell">
              <div className="carousel-container">
                {showCarouselLeft && (
                  <button
                    type="button"
                    className="carousel-btn carousel-btn-left"
                    onClick={() => scrollCarousel('left')}
                    aria-label={t('db.scrollLeft')}
                  >
                    ‹
                  </button>
                )}

                <div className="carousel-track" ref={carouselRef}>
                  {needs.map((need) => {
                    const shelterInfo = getNeedShelterInfo(need, t);
                    return (
                      <div key={need._carouselKey || need.id} className="carousel-card">
                        <div className="card-priority" aria-hidden>
                          {String(need.priority || '').toLowerCase() === 'high' && '🔴'}
                          {String(need.priority || '').toLowerCase() === 'medium' && '🟡'}
                          {String(need.priority || '').toLowerCase() === 'low' && '🟢'}
                        </div>
                        <h4>{need.title}</h4>
                        {need.description && (
                          <p className="card-description">{need.description}</p>
                        )}
                        {shelterInfo && (
                          <div className="card-shelter">
                            <div className="shelter-name">{shelterInfo.name}</div>
                            {shelterInfo.address && (
                              <div className="shelter-location">
                                <MapPin size={12} aria-hidden />
                                {shelterInfo.address}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {showCarouselRight && (
                  <button
                    type="button"
                    className="carousel-btn carousel-btn-right"
                    onClick={() => scrollCarousel('right')}
                    aria-label={t('db.scrollLeft')}
                  >
                    ›
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <footer className="footer-text">{t('home.footer')}</footer>
      </div>
    </Layout>
  );
};

export default HomePage;
