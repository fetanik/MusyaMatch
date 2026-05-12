import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, Calendar, Heart, MapPin, 
  Video, LayoutDashboard, Gamepad2, Pill, Gift
} from 'lucide-react';
import Layout from '../components/Layout';
import '../styles/HomePage.css';

const getApiBaseUrl = () => {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!rawBase) {
    return '/api';
  }
  return rawBase.replace(/\/+$/, '').replace(/\/api$/i, '') + '/api';
};

const API_BASE_URL = getApiBaseUrl();

const HomePage = () => {
  const navigate = useNavigate();
  const greyIconStyle = { background: '#f1f2f6', color: '#2d3436' };
  const [needs, setNeeds] = useState([]);
  const [isLoadingNeeds, setIsLoadingNeeds] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    // Get current user from localStorage
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        setCurrentUser(user);
      }
    } catch (err) {
      console.error('Failed to parse user:', err);
    }
  }, []);

  useEffect(() => {
    const loadNeeds = async () => {
      try {
        setIsLoadingNeeds(true);
        const response = await fetch(`${API_BASE_URL}/needs`);
        if (response.ok) {
          const data = await response.json();
          const openNeeds = (Array.isArray(data) ? data : []).filter(
            (need) => need.status === 'open'
          );
          setNeeds(openNeeds.slice(0, 10));
        }
      } catch (error) {
        console.error('Failed to load needs:', error);
        setNeeds([]);
      } finally {
        setIsLoadingNeeds(false);
      }
    };
    loadNeeds();
  }, []);

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
          <div className="action-card-info">
            <div className="icon-box"><Sparkles size={24} /></div>
            <h3>AI Matching</h3>
            <p>Find cats that match your lifestyle</p>
          </div>

          <div className="action-card-info">
            <div className="icon-box"><Gift size={24} /></div>
            <h3>Discounts</h3>
            <p>Exchange points for discounts</p>
          </div>
          
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
          100% free тАв No credit card required
        </p>

        {/* ╨б╨┐╨╕╤Б╨╛╨║ ╨╛╤Б╨╛╨▒╨╗╨╕╨▓╨╛╤Б╤В╨╡╨╣ */}
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

          <div className="feature-btn" style={{ cursor: 'default' }}>
            <div className="icon-box grey" style={greyIconStyle}><Sparkles size={24}/></div>
            <div>
              <h4>Marketplace</h4>
              <p>Exchange points for partner discounts</p>
            </div>
          </div>

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
                View all тЖТ
              </Link>
            </div>

            <div className="carousel-container">
              <button
                type="button"
                className="carousel-btn carousel-btn-left"
                onClick={() => scrollCarousel('left')}
                aria-label="Scroll left"
              >
                тА╣
              </button>

              <div className="carousel-track" ref={carouselRef}>
                {needs.map((need) => (
                  <div key={need.id} className="carousel-card">
                    <div className="card-priority">
                      {need.priority === 'high' && '🔴'}
                      {need.priority === 'medium' && '🟡'}
                      {need.priority === 'low' && '🟢'}
                    </div>
                    <h4>{need.title}</h4>
                    {need.description && (
                      <p className="card-description">{need.description}</p>
                    )}
                    {need.shelter && (
                      <div className="card-shelter">
                        <div className="shelter-name">{need.shelter.name}</div>
                        {need.shelter.address && (
                          <div className="shelter-location">
                            <MapPin size={12} />
                            {need.shelter.address}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="carousel-btn carousel-btn-right"
                onClick={() => scrollCarousel('right')}
                aria-label="Scroll right"
              >
                тА║
              </button>
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
