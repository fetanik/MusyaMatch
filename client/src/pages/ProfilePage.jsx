import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import '../styles/ProfilePage.css'; 

import { FiUser, FiMail, FiSave, FiHome, FiHeart, FiMapPin } from "react-icons/fi";

const ProfilePage = () => {
  const navigate = useNavigate(); 

  // Стан для зберігання введених даних
  const [name, setName] = useState('Alex Johnson');
  const [email, setEmail] = useState('alex.j@example.com');

  const handleSave = (e) => {
    e.preventDefault();
    alert('Дані успішно збережено!');
  };

  return (
    <div className="profile-settings-page">
      {/* Верхня помаранчева частина */}
      <div className="settings-header-bg">
        <h2>Edit Profile</h2>
        <p>Update your personal information</p>
      </div>

      {/* Основний контент з формою */}
      <div className="settings-content">
        <form className="settings-form" onSubmit={handleSave}>
          <div className="input-group">
            <label><FiUser /> Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter your full name"
            />
          </div>

          <div className="input-group">
            <label><FiMail /> Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email"
            />
          </div>

          <button type="submit" className="save-btn">
            <FiSave /> Save Changes
          </button>
        </form>
      </div>

      {/* Нижня навігація (така ж як на Home) */}
      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/dashboard')}>
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
        {/* Кнопка Profile тут активна */}
        <button className="nav-item active">
          <span className="nav-icon"><FiUser size={20} /></span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default ProfilePage;