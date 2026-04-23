import React from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, Calendar, Heart, MapPin, 
  Video, LayoutDashboard, Gamepad2, Trophy, Cat 
} from 'lucide-react';
import Layout from '../components/Layout';
import '../styles/HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const greyIconStyle = { background: '#f1f2f6', color: '#2d3436' };

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
          <button className="action-card-btn">
            <div className="icon-box"><Sparkles size={24} /></div>
            <h3>AI Matching</h3>
            <p>Find cats that match your lifestyle</p>
          </button>
          
          <button className="action-card-btn">
            <div className="icon-box"><Calendar size={24} /></div>
            <h3>Health Tracking</h3>
            <p>Manage vaccinations & feeding</p>
          </button>
          
          <button className="action-card-btn">
            <div className="icon-box"><Heart size={24} /></div>
            <h3>Foster Program</h3>
            <p>Help cats temporarily</p>
          </button>
          
          <button className="action-card-btn">
            <div className="icon-box"><MapPin size={24} /></div>
            <h3>Vet Finder</h3>
            <p>Locate nearby clinics</p>
          </button>
        </section>

        <div className="points-banner">
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <Trophy size={35} />
            <div>
              <h3 style={{ margin: 0 }}>Earn Purr-Points! 🎯</h3>
              <p style={{ margin: 0 }}>Complete tasks, level up, unlock achievements</p>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '75%', height: '100%', background: 'white', borderRadius: '10px' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '8px' }}>
            <span>Example Progress</span>
            <span>Level 5</span>
          </div>
        </div>


        <button className="btn-main" onClick={() => navigate('/register')}>Get Started 😻</button>
        
        <div className="btn-secondary-group">
          <button className="btn-outline" onClick={() => navigate('/chat')}>💬 Chat with AI</button>
          <button className="btn-outline">Foster a Cat</button>
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


        <section className="features-section">
          <h3>What Makes MusyaMatch Special?</h3>
          
          <button className="feature-btn">
            <div className="icon-box grey" style={greyIconStyle}><Video size={24}/></div>
            <div>
              <h4>AR Preview</h4>
              <p>See cats in your home before adopting</p>
            </div>
          </button>

          <button className="feature-btn">
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
          
          
          <button className="feature-btn">
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