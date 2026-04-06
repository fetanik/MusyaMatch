import React from 'react';
import '../styles/ProfilePage.css'; 

// Підключаємо стабільний набір іконок Feather (fi) та FontAwesome (fa6) для кота
import { 
  FiBell, FiAward, FiStar, FiHeart, FiCpu, FiMessageSquare, 
  FiCalendar, FiAlertCircle, FiUsers, FiMapPin, FiTrendingUp, 
  FiHome, FiUser 
} from "react-icons/fi";
import { FaCat } from "react-icons/fa6";

const ProfilePage = () => {
  return (
    <div className="profile-page">
      {/* Верхня помаранчева частина */}
      <div className="profile-header-bg">
        <header className="profile-header">
          <div className="user-info">
            <div className="avatar">
              <FaCat color="#FFB347" size={24} /> 
            </div>
            <div className="text-info">
              <h1>Hello, Alex Johnson!</h1>
              <p>Level 1 Cat Parent</p>
            </div>
          </div>
          <button className="notification-btn">
            <FiBell />
          </button>
        </header>

        <div className="purr-points-card">
          <div className="points-header">
            <p className="points-label">Your Purr-Points</p>
            <div className="points-icon-badge">
              <FiAward color="white" />
            </div>
          </div>
          
          {/* Обнулили бали */}
          <div className="points-value">
            <h2>0</h2>
            <span>pts</span>
          </div>

          {/* Перший рівень */}
          <div className="level-info">
            <span className="current-level">Level 1</span>
            <span className="points-to-next">250 pts to Level 2</span>
          </div>

          {/* Пуста смужка прогресу (width: 0%) */}
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: '0%' }}></div>
          </div>

          {/* Нуль досягнень */}
          <div className="achievements-row">
            <div className="achievement-badge">
              <FiStar /> 0 Achievements
            </div>
            <div className="achievement-badge foster-badge">
              <FiHeart fill="currentColor" /> 0 Fosters
            </div>
          </div>
        </div>
      </div>

      {/* Основний контент сторінки */}
      <div className="profile-content">
        <div className="ai-banner">
          <div className="ai-icon-wrapper">
            <FiCpu /> 
          </div>
          <div className="ai-text">
            <h3>Chat with Musya AI</h3>
            <p>Get expert advice & find your perfect match</p>
          </div>
          <button className="ai-action-btn">
            <FiMessageSquare />
          </button>
        </div>

        <div className="section-header">
          <h2>Health & Care</h2>
          <button className="view-all-btn">View All</button>
        </div>

        <div className="care-card">
          <div className="care-card-header">
            <span className="icon-calendar"><FiCalendar /></span>
            <div className="care-title">
              <h4>Vaccination Calendar</h4>
              <p>2 upcoming</p>
            </div>
          </div>
          
          <div className="care-item warning">
            <span className="alert-icon"><FiAlertCircle /></span>
            <div className="item-details">
              <strong>FVRCP (Distemper)</strong>
              <p>Due: 2026-03-25</p>
            </div>
            <button className="schedule-btn">Schedule</button>
          </div>

          <div className="care-item warning">
            <span className="alert-icon"><FiAlertCircle /></span>
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
            <div className="action-icon"><FiUsers /></div>
            <h4>Foster a Cat</h4>
            <p>2 cats need help</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><FiMapPin /></div>
            <h4>Find Vet</h4>
            <p>4 nearby clinics</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><FiHeart /></div>
            <h4>Adopt a Cat</h4>
            <p>8 cats available</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><FiTrendingUp /></div>
            <h4>My Progress</h4>
            <p>View achievements</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item">
          <span className="nav-icon"><FiHome size={20} /></span>
          <span>Home</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon"><FiHeart size={20} /></span>
          <span>Foster</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon"><FiMapPin size={20} /></span>
          <span>Map</span>
        </button>
        <button className="nav-item active">
          <span className="nav-icon"><FiUser size={20} /></span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default ProfilePage;