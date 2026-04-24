import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, Calendar, Heart, MapPin, 
  Video, LayoutDashboard, Gamepad2, Pill 
} from 'lucide-react';
import Layout from '../components/Layout';
import '../styles/HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const greyIconStyle = { background: '#f1f2f6', color: '#2d3436' };

  return (
    <Layout>
      {/* У шапку профілю реєстрація/вхід зазвичай прокидається через компонент Layout, 
          але ми залишили кнопку Get Started як основний вхід */}
      <div className="content-container">
        
        <section className="hero">
          <div className="hero-avatar">🐱</div>
          <h2>Welcome to <span>MusyaMatch</span></h2>
          <p className="hero-subtitle">
            Find your purrfect companion, track their health, and become the best cat parent!
          </p>
        </section>

        {/* Інформаційні картки (раніше були кнопками) */}
        <section className="grid-cards">
          <div className="action-card-info">
            <div className="icon-box"><Sparkles size={24} /></div>
            <h3>AI Matching</h3>
            <p>Find cats that match your lifestyle</p>
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
          <button className="btn-outline">💬 Chat with AI</button>
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

        <footer className="footer-text">
          Join thousands of happy cat parents! 🐱
        </footer>
      </div>
    </Layout>
  );
};

export default HomePage;