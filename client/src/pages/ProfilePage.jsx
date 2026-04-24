import React, { useState } from 'react';
import '../styles/ProfilePage.css'; 
import BottomNav from '../components/BottomNav';

import { User, Mail, Save } from "lucide-react";

const ProfilePage = () => {
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
            <label><User /> Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter your full name"
            />
          </div>

          <div className="input-group">
            <label><Mail /> Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email"
            />
          </div>

          <button type="submit" className="save-btn">
            <Save /> Save Changes
          </button>
        </form>
      </div>

      <BottomNav active="profile" />
    </div>
  );
};

export default ProfilePage;