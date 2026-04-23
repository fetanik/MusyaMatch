import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ManagerSettingsPage.css';

import {
  FiHome,
  FiFileText,
  FiMapPin,
  FiUser,
  FiArrowLeft,
  FiUpload,
  FiTrash2,
  FiSave,
} from 'react-icons/fi';

const API_BASE_URL = 'http://localhost:3000/api/shelter';

const ManagerSettingsPage = () => {
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    shelterName: '',
    email: '',
    phone: '',
    instagram: '',
    facebook: '',
    telegram: '',
    address: '',
    description: '',
    adoptionConditions: '',
    password: '',
    confirmPassword: '',
    logo: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user')) || {};
        const currentUserId = currentUser.id || currentUser.userId;

        if (!currentUserId) {
          setError('User ID was not found. Please login again.');
          setIsLoading(false);
          return;
        }

        setUserId(currentUserId);

        const response = await fetch(`${API_BASE_URL}/profile/${currentUserId}`);
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.message || `HTTP ${response.status}`);
        }

        setFormData((prev) => ({
          ...prev,
          shelterName: result?.name || '',
          email: result?.email || '',
          phone: result?.phone || '',
          instagram: result?.instagram || '',
          facebook: result?.facebook || '',
          telegram: result?.telegram || '',
          address: result?.address || '',
          description: result?.description || '',
          adoptionConditions: result?.adoptionConditions || '',
          logo: result?.logo || '',
        }));

        localStorage.setItem(
          'user',
          JSON.stringify({
            ...currentUser,
            id: currentUserId,
            userId: currentUserId,
            email: result?.email || currentUser.email || '',
            name: result?.name || currentUser.name || '',
            shelterName: result?.name || currentUser.shelterName || '',
            phone: result?.phone || '',
            instagram: result?.instagram || '',
            facebook: result?.facebook || '',
            telegram: result?.telegram || '',
            address: result?.address || '',
            description: result?.description || '',
            adoptionConditions: result?.adoptionConditions || '',
            logo: result?.logo || '',
          })
        );
      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load shelter profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        logo: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo: '',
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!userId) {
      setError('User ID was not found.');
      return;
    }

    if (!formData.shelterName.trim()) {
      setError('Please enter shelter name');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter email');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password.trim(),
        name: formData.shelterName.trim(),
        phone: formData.phone.trim(),
        logo: formData.logo,
        address: formData.address.trim(),
        description: formData.description.trim(),
        adoptionConditions: formData.adoptionConditions.trim(),
        instagram: formData.instagram.trim(),
        facebook: formData.facebook.trim(),
        telegram: formData.telegram.trim(),
      };

      const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || `HTTP ${response.status}`);
      }

      const savedData = result;
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...currentUser,
          id: savedData.userId,
          userId: savedData.userId,
          email: savedData.email || '',
          name: savedData.name || '',
          shelterName: savedData.name || '',
          phone: savedData.phone || '',
          instagram: savedData.instagram || '',
          facebook: savedData.facebook || '',
          telegram: savedData.telegram || '',
          address: savedData.address || '',
          description: savedData.description || '',
          adoptionConditions: savedData.adoptionConditions || '',
          logo: savedData.logo || '',
        })
      );

      setFormData((prev) => ({
        ...prev,
        shelterName: savedData.name || '',
        email: savedData.email || '',
        phone: savedData.phone || '',
        instagram: savedData.instagram || '',
        facebook: savedData.facebook || '',
        telegram: savedData.telegram || '',
        address: savedData.address || '',
        description: savedData.description || '',
        adoptionConditions: savedData.adoptionConditions || '',
        logo: savedData.logo || '',
        password: '',
        confirmPassword: '',
      }));

      setMessage('Profile saved successfully');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to save profile');
    }
  };

  return (
    <div className="manager-settings-page">
      <header className="settings-hero">
        <div className="settings-header-row">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/manager/profile')}
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="settings-title-block">
            <h1>Manager Profile Settings</h1>
            <p>Edit shelter information and profile details</p>
          </div>
        </div>
      </header>

      <main className="settings-content">
        <form className="settings-form" onSubmit={handleSave}>
          <section className="settings-card logo-card">
            <h2>Shelter Logo</h2>

            <div className="logo-section">
              <div className="logo-preview">
                {formData.logo ? (
                  <img src={formData.logo} alt="Shelter logo" />
                ) : (
                  <div className="logo-placeholder">
                    <span>No logo</span>
                  </div>
                )}
              </div>

              <div className="logo-actions">
                <label className="upload-btn">
                  <FiUpload size={16} />
                  Upload Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
                </label>

                {formData.logo && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={handleRemoveLogo}
                  >
                    <FiTrash2 size={16} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h2>Main Information</h2>

            <div className="settings-grid">
              <div className="field-group">
                <label>Shelter Name</label>
                <input
                  type="text"
                  name="shelterName"
                  value={formData.shelterName}
                  onChange={handleChange}
                  placeholder="Enter shelter name"
                />
              </div>

              <div className="field-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                />
              </div>

              <div className="field-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="field-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter shelter address"
                />
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h2>Social Networks</h2>

            <div className="settings-grid">
              <div className="field-group">
                <label>Instagram</label>
                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  placeholder="@your_instagram"
                />
              </div>

              <div className="field-group">
                <label>Facebook</label>
                <input
                  type="text"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  placeholder="Facebook page link or name"
                />
              </div>

              <div className="field-group full-width">
                <label>Telegram</label>
                <input
                  type="text"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleChange}
                  placeholder="@telegram or link"
                />
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h2>Shelter Description</h2>

            <div className="field-group">
              <label>About Shelter / Activity Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                placeholder="Describe shelter activity, mission, care conditions, etc."
              />
            </div>

            <div className="field-group">
              <label>Adoption Conditions</label>
              <textarea
                name="adoptionConditions"
                value={formData.adoptionConditions}
                onChange={handleChange}
                rows="5"
                placeholder="Describe adoption terms and requirements"
              />
            </div>
          </section>

          <section className="settings-card">
            <h2>Change Password</h2>

            <div className="settings-grid">
              <div className="field-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                />
              </div>

              <div className="field-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </section>

          {isLoading && <div className="form-alert">Loading profile...</div>}
          {error && <div className="form-alert error-alert">{error}</div>}
          {message && <div className="form-alert success-alert">{message}</div>}

          <div className="form-buttons">
            <button
              type="button"
              className="secondary-action-btn"
              onClick={() => navigate('/manager/profile')}
            >
              Back to Dashboard
            </button>

            <button type="submit" className="primary-action-btn" disabled={isLoading}>
              <FiSave size={18} />
              Save Profile
            </button>
          </div>
        </form>
      </main>

      <nav className="settings-bottom-nav">
        <button
          className="settings-nav-item"
          type="button"
          onClick={() => navigate('/manager/profile')}
        >
          <FiHome size={20} />
          <span>Home</span>
        </button>

        <button
          className="settings-nav-item"
          type="button"
          onClick={() => navigate('/manager/profile')}
        >
          <FiFileText size={20} />
          <span>Requests</span>
        </button>

        <button
          className="settings-nav-item"
          type="button"
          onClick={() => navigate('/pharmacies')}
        >
          <FiMapPin size={20} />
          <span>Map</span>
        </button>

        <button className="settings-nav-item active" type="button">
          <FiUser size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default ManagerSettingsPage;