import React from 'react';
import { useNavigate } from 'react-router-dom'; // інструмент для навігації
import '../styles/DashboardPage.css'; 

import { 
  Bell, Award, Star, Heart, Cpu, MessageSquare, 
  Calendar, AlertCircle, Users, MapPin, TrendingUp, 
  Home, User, Cat 
} from "lucide-react";

const DashboardPage = () => {
  const navigate = useNavigate(); // Ініціалізація навігації

  return (
    <div className="profile-page">
      {/* Верхня помаранчева частина */}
      <div className="profile-header-bg">
        <header className="profile-header">
          <div className="user-info">
            <div className="avatar">
              <Cat color="#FFB347" size={24} /> 
            </div>
            <div className="text-info">
              <h1>Hello, Alex Johnson!</h1>
              <p>Level 1 Cat Parent</p>
            </div>
          </div>
          <button className="notification-btn">
            <Bell />
          </button>
        </header>

        <div className="purr-points-card">
          <div className="points-header">
            <p className="points-label">Your Purr-Points</p>
            <div className="points-icon-badge">
              <Award color="white" />
            </div>
          </div>
          
          <div className="points-value">
            <h2>0</h2>
            <span>pts</span>
          </div>

          <div className="level-info">
            <span className="current-level">Level 1</span>
            <span className="points-to-next">250 pts to Level 2</span>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: '0%' }}></div>
          </div>

          <div className="achievements-row">
            <div className="achievement-badge">
              <Star /> 0 Achievements
            </div>
            <div className="achievement-badge foster-badge">
              <Heart fill="currentColor" /> 0 Fosters
            </div>
          </div>
        </div>
      </div>

      {/* Основний контент сторінки */}
      <div className="profile-content">
        <div className="ai-banner">
          <div className="ai-icon-wrapper">
            <Cpu /> 
          </div>
          <div className="ai-text">
            <h3>Chat with Musya AI</h3>
            <p>Get expert advice & find your perfect match</p>
          </div>
          <button className="ai-action-btn">
            <MessageSquare />
          </button>
        </div>

        <div className="section-header">
          <h2>Health & Care</h2>
          <button className="view-all-btn">View All</button>
        </div>

        <div className="care-card">
          <div className="care-card-header">
            <span className="icon-calendar"><Calendar /></span>
            <div className="care-title">
              <h4>Vaccination Calendar</h4>
              <p>2 upcoming</p>
            </div>
          </div>
          
          <div className="care-item warning">
            <span className="alert-icon"><AlertCircle /></span>
            <div className="item-details">
              <strong>FVRCP (Distemper)</strong>
              <p>Due: 2026-03-25</p>
            </div>
            <button className="schedule-btn">Schedule</button>
          </div>

          <div className="care-item warning">
            <span className="alert-icon"><AlertCircle /></span>
            <div className="item-details">
              <strong>Rabies</strong>
              <p>Due: 2026-04-15</p>
            </div>
            <button className="schedule-btn">Schedule</button>
          </div>
          
          <button className="view-more-link">View All Vaccinations →</button>
        </div>

        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>

        <div className="quick-actions-grid">
          <div className="action-card">
            <div className="action-icon"><Users /></div>
            <h4>Foster a Cat</h4>
            <p>2 cats need help</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><MapPin /></div>
            <h4>Find Vet</h4>
            <p>4 nearby clinics</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><Heart /></div>
            <h4>Adopt a Cat</h4>
            <p>8 cats available</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><TrendingUp /></div>
            <h4>My Progress</h4>
            <p>View achievements</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item active">
          <span className="nav-icon"><Home size={20} /></span>
          <span>Home</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon"><Heart size={20} /></span>
          <span>Foster</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon"><MapPin size={20} /></span>
          <span>Map</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')}>
          <span className="nav-icon"><User size={20} /></span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default DashboardPage;