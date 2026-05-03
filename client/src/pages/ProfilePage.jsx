import React, { useState } from 'react';
import '../styles/ProfilePage.css';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';

import { User, Mail, Save } from 'lucide-react';

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const ProfilePage = () => {
  const { notify } = useMessages();
  const [name, setName] = useState(() => localStorage.getItem('userName') || 'Alex Johnson');
  const [email, setEmail] = useState(
    () => localStorage.getItem('userEmail') || storedUser.email || 'alex.j@example.com'
  );
  const [phone, setPhone] = useState(() => localStorage.getItem('userPhone') || '');
  const [address, setAddress] = useState(() => localStorage.getItem('userAddress') || '');
  const [instagram, setInstagram] = useState(
    () => localStorage.getItem('userInstagram') || ''
  );
  const [facebook, setFacebook] = useState(() => localStorage.getItem('userFacebook') || '');
  const [telegram, setTelegram] = useState(() => localStorage.getItem('userTelegram') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        await notify("Passwords don't match!", { type: 'error', title: 'Error' });
        return;
      }
    }

    localStorage.setItem('userName', name.trim());
    localStorage.setItem('userEmail', email.trim());
    localStorage.setItem('userPhone', phone.trim());
    localStorage.setItem('userAddress', address.trim());
    localStorage.setItem('userInstagram', instagram.trim());
    localStorage.setItem('userFacebook', facebook.trim());
    localStorage.setItem('userTelegram', telegram.trim());

    if (!localStorage.getItem('userRole')) {
      localStorage.setItem('userRole', 'user');
    }

    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', '1');
    }

    await notify('Profile updated successfully!', { type: 'success', title: 'Success' });
  };

  return (
    <div className="profile-settings-page">
      <div className="settings-header-bg">
        <h2>Edit Profile</h2>
        <p>Update your personal information</p>
      </div>

      <div className="settings-content">
        <form className="settings-form" onSubmit={handleSave}>
          <div className="settings-card">
            <h3>Main Information</h3>

            <div className="input-grid">
              <div className="input-group">
                <label>
                  <User size={16} /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="input-group">
                <label>
                  <Mail size={16} /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="input-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="input-group">
                <label>Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                />
              </div>
            </div>
          </div>

          <div className="settings-card">
            <h3>Social Networks</h3>

            <div className="input-grid">
              <div className="input-group">
                <label>Instagram</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@your_instagram"
                />
              </div>

              <div className="input-group">
                <label>Facebook</label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="Facebook page link or name"
                />
              </div>

              <div className="input-group full-width">
                <label>Telegram</label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@telegram or link"
                />
              </div>
            </div>
          </div>

          <div className="settings-card">
            <h3>Change Password</h3>

            <div className="input-grid">
              <div className="input-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="input-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="save-btn">
            <Save size={16} /> Save Changes
          </button>
        </form>
      </div>

      <BottomNav active="profile" />
    </div>
  );
};

export default ProfilePage;