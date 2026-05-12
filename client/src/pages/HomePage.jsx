import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, Calendar, Heart, MapPin, 
  Video, LayoutDashboard, Gamepad2, Pill 
} from 'lucide-react';
import Layout from '../components/Layout';
import '../styles/HomePage.css';

const getNeedsApiBaseUrl = () => {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!rawBase) return '/api/needs';
  const normalized = rawBase.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${normalized}/api/needs`;
};

const NEEDS_API_BASE_URL = getNeedsApiBaseUrl();

const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getCurrentUserContext = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      userId:
        toPositiveInt(user.userId) ??
        toPositiveInt(user.id) ??
        toPositiveInt(localStorage.getItem('userId')) ??
        toPositiveInt(localStorage.getItem('basicUserId')) ??
        toPositiveInt(localStorage.getItem('currentUserId')),
      shelterId:
        toPositiveInt(user.shelterId) ??
        toPositiveInt(user.shelter_id) ??
        toPositiveInt(localStorage.getItem('shelterId')) ??
        toPositiveInt(localStorage.getItem('currentShelterId')),
    };
  } catch {
    return {
      userId:
        toPositiveInt(localStorage.getItem('userId')) ??
        toPositiveInt(localStorage.getItem('basicUserId')) ??
        toPositiveInt(localStorage.getItem('currentUserId')),
      shelterId:
        toPositiveInt(localStorage.getItem('shelterId')) ??
        toPositiveInt(localStorage.getItem('currentShelterId')),
    };
  }
};

const getNeedShelterInfo = (need) => {
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
      name: nameFromNeed || 'My Shelter',
      address: addressFromNeed || '',
    };
  }
  return null;
};

const HomePage = () => {
  const navigate = useNavigate();
  const greyIconStyle = { background: '#f1f2f6', color: '#2d3436' };
  const [needs, setNeeds] = useState([]);
  const [isLoadingNeeds, setIsLoadingNeeds] = useState(false);
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

  useEffect(() => {
    const fetchShelterByUserId = async (userId) => {
      if (!toPositiveInt(userId)) return null;
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/shelter/profile/${userId}`);
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
        })
      );
    };

    const loadNeeds = async () => {
      try {
        setIsLoadingNeeds(true);
        const { userId, shelterId } = getCurrentUserContext();
        const params = new URLSearchParams();
        if (shelterId) params.set('shelterId', String(shelterId));
        if (userId) params.set('userId', String(userId));
        const url = params.toString()
          ? `${NEEDS_API_BASE_URL}?${params.toString()}`
          : NEEDS_API_BASE_URL;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load needs');
        }

        let data = await response.json();
        let realNeeds = (Array.isArray(data) ? data : [])
          .filter((need) => need?.status === 'open')
          .map((need) => ({ ...need, _carouselKey: `real-${need.id}` }));

        // Fallback: if user/shelter filtering returns nothing, show open DB needs.
        if (realNeeds.length === 0 && (userId || shelterId)) {
          const allNeedsResponse = await fetch(NEEDS_API_BASE_URL);
          if (allNeedsResponse.ok) {
            data = await allNeedsResponse.json();
            realNeeds = (Array.isArray(data) ? data : [])
              .filter((need) => need?.status === 'open')
              .map((need) => ({ ...need, _carouselKey: `real-${need.id}` }));
          }
        }
        realNeeds = await enrichNeedsWithShelter(realNeeds);
        setNeeds(realNeeds);
      } catch (error) {
        console.error('Failed to load needs:', error);
        setNeeds([]);
      } finally {
        setIsLoadingNeeds(false);
      }
    };

    loadNeeds();
  }, []);

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
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Layout>
     
      <div className="content-container">
        
        <section className="hero">
          <div className="hero-avatar">🐱</div>
          <h2>Welcome to <span>MusyaMatch</span></h2>
          <p className="hero-subtitle">
            Find your purrfect companion, track their health, and become the best cat parent!
          </p>
        </section>


        <section className="grid-cards">
          <button className="action-card-btn" onClick={() => navigate('/chat')}>
            <div className="icon-box"><Sparkles size={24} /></div>
            <h3>AI Matching</h3>
            <p>Find cats that match your lifestyle</p>
          </button>
          
          <div className="action-card-info">
            <div className="icon-box"><Calendar size={24} /></div>
            <h3>Health Tracking</h3>
            <p>Manage vaccinations & feeding</p>
          </div>
          
          <div className="action-card-info">
            <div className="icon-box"><Heart size={24} /></div>
            <h3>Foster Program</h3>
            <p>Help cats temporarily</p>
          </div>
          
          <div className="action-card-info">
            <div className="icon-box"><MapPin size={24} /></div>
            <h3>Vet Finder</h3>
            <p>Locate nearby clinics</p>
          </div>
        </section>


        <button className="btn-main" onClick={() => navigate('/register')}>Get Started 😻</button>
        
        <div className="btn-secondary-group">
          <button className="btn-outline" onClick={() => navigate('/chat')}>💬 Chat with AI</button>
          <button className="btn-outline" onClick={() => navigate('/pharmacies')}>
            <Pill size={18} style={{marginRight: '8px'}}/> Pharmacies
          </button>
        </div>
        
        <Link
          to="/gallery"
          className="btn-outline btn-outline-block"
          style={{ marginTop: '10px' }}
        >
          Browse All Cats
        </Link>

        <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '20px' }}>
          100% free • No credit card required
        </p>

        {/* Список особливостей */}
        <section className="features-section">
          <h3>What Makes MusyaMatch Special?</h3>
          
          <button className="feature-btn">
            <div className="icon-box grey" style={greyIconStyle}><Video size={24}/></div>
            <div>
              <h4>AR Preview</h4>
              <p>See cats in your home before adopting</p>
            </div>
          </button>

          <button className="feature-btn" onClick={() => navigate('/calendar')}>
            <div className="icon-box grey" style={greyIconStyle}><LayoutDashboard size={24}/></div>
            <div>
              <h4>Health Dashboard</h4>
              <p>Track vaccinations, feeding schedules</p>
            </div>
          </button>

          <button className="feature-btn">
            <div className="icon-box grey" style={greyIconStyle}><Gamepad2 size={24}/></div>
            <div>
              <h4>Gamification</h4>
              <p>Earn points and unlock achievements</p>
            </div>
          </button>
          
          <button className="feature-btn" onClick={() => navigate('/pharmacies')}>
            <div className="icon-box grey" style={greyIconStyle}><MapPin size={24}/></div>
            <div>
              <h4>Map Integration</h4>
              <p>Find nearby vets and pharmacies</p>
            </div>
          </button>
        </section>

        {/* Shelter Needs Carousel */}
        {needs.length > 0 && (
          <section className="shelter-needs-carousel-section">
            <div className="carousel-header">
              <h3>Help Shelters in Need</h3>
              <Link to="/shelter-needs" className="view-all-link">
                View all →
              </Link>
            </div>

            <div className="carousel-shell">
              <div className="carousel-container">
              {showCarouselLeft && (
              <button
                type="button"
                className="carousel-btn carousel-btn-left"
                onClick={() => scrollCarousel('left')}
                aria-label="Scroll left"
              >
                ‹
              </button>
              )}

              <div className="carousel-track" ref={carouselRef}>
                {needs.map((need) => {
                  const shelterInfo = getNeedShelterInfo(need);
                  return (
                  <div key={need._carouselKey || need.id} className="carousel-card">
                    <div className="card-priority">
                      {need.priority === 'high' && '🔴'}
                      {need.priority === 'medium' && '🟡'}
                      {need.priority === 'low' && '🟢'}
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
                            <MapPin size={12} />
                            {shelterInfo.address}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )})}
              </div>

              {showCarouselRight && (
              <button
                type="button"
                className="carousel-btn carousel-btn-right"
                onClick={() => scrollCarousel('right')}
                aria-label="Scroll right"
              >
                ›
              </button>
              )}
              </div>
            </div>
          </section>
        )}

        <footer className="footer-text">
          Join thousands of happy cat parents! 🐱
        </footer>
      </div>
    </Layout>
  );
};

export default HomePage;