import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import '../styles/ManagerProfile.css'; 

import { 
  FiBell, FiPlusCircle, FiFileText, FiCalendar, 
  FiAlertCircle, FiUsers, FiClipboard, FiEdit,
  FiHome, FiSettings, FiCheckCircle, FiUser
} from "react-icons/fi";
import { FaPaw } from "react-icons/fa6";

const ManagerProfile = () => {
  const navigate = useNavigate(); 

  return (
    <div className="manager-page">
      <div className="manager-header-bg">
        <header className="manager-header">
          <div className="user-info">
            <div className="avatar">
              <FaPaw color="#FFB347" size={24} /> 
            </div>
            <div className="text-info">
              <h1>Happy Paws Shelter</h1>
              <p>Manager Dashboard</p>
            </div>
          </div>
          <button className="notification-btn">
            <FiBell />
          </button>
        </header>

        <div className="dashboard-stats-card">
          <div className="points-header">
            <p className="points-label">Shelter Overview</p>
            <div className="points-icon-badge">
              <FiFileText color="white" />
            </div>
          </div>
          
          <div className="stats-row">
            <div className="stat-item">
              <h2>0</h2>
              <span>Active Cats</span>
            </div>
            <div className="stat-item">
              <h2>0</h2>
              <span>Requests</span>
            </div>
            <div className="stat-item warning-stat">
              <h2>0</h2>
              <span>Urgent</span>
            </div>
          </div>
        </div>
      </div>

      <div className="manager-content">
        
        <div className="ai-banner">
          <div className="ai-icon-wrapper">
            <FiEdit /> 
          </div>
          <div className="ai-text">
            <h3>Musya AI Generator</h3>
            <p>Auto-generate captivating cat profiles</p>
          </div>
          <button className="ai-action-btn">
            <FiPlusCircle />
          </button>
        </div>

        <div className="section-header">
          <h2>Pending Applications</h2>
          <button className="view-all-btn">Review All</button>
        </div>

        <div className="care-card">
          <div className="care-item">
            <span className="app-icon adoption"><FiUsers /></span>
            <div className="item-details">
              <strong>Adoption: Luna</strong>
              <p>Applicant: Maria S. • 2 hrs ago</p>
            </div>
            <button className="schedule-btn">Review</button>
          </div>

          <div className="care-item">
            <span className="app-icon foster"><FiHome /></span>
            <div className="item-details">
              <strong>Foster: Milo</strong>
              <p>Applicant: Ivan D. • 1 day ago</p>
            </div>
            <button className="schedule-btn">Review</button>
          </div>
        </div>

        <div className="section-header">
          <h2>Management Actions</h2>
        </div>

        <div className="quick-actions-grid">
          <div className="action-card">
            <div className="action-icon"><FiPlusCircle /></div>
            <h4>Add Cat</h4>
            <p>Create profile</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><FiClipboard /></div>
            <h4>Needs</h4>
            <p>Update supplies</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><FiCalendar /></div>
            <h4>Events</h4>
            <p>Plan volunteer day</p>
          </div>
          <div className="action-card">
            <div className="action-icon"><FiCheckCircle /></div>
            <h4>Adopted</h4>
            <p>Update status</p>
          </div>
        </div>
      </div>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/')}>
          <span className="nav-icon"><FiHome size={20} /></span>
          <span>Home</span>
        </button>
        
        <button className="nav-item">
          <span className="nav-icon"><FaPaw size={20} /></span>
          <span>Cats</span>
        </button>
        
        <button className="nav-item">
          <span className="nav-icon"><FiFileText size={20} /></span>
          <span>Requests</span>
        </button>
        
        <button className="nav-item active" onClick={() => navigate('/manager/profile')}>
          <span className="nav-icon"><FiUser size={20} /></span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default ManagerProfile;