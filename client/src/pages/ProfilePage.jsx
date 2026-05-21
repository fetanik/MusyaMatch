import React, { useEffect, useState } from 'react';
import '../styles/ManagerSettingsPage.css';
import BottomNav from '../components/BottomNav';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/I18nContext';
import { apiUrl } from '../utils/apiUrl';

import { FiUpload, FiTrash2, FiSave } from 'react-icons/fi';
import { FaCat } from 'react-icons/fa6';

const API_BASE_URL = apiUrl('/users');

const ProfilePage = () => {
  const { t } = useI18n();
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    instagram: '',
    facebook: '',
    telegram: '',
    address: '',
    password: '',
    confirmPassword: '',
    photo: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user')) || {};
        const currentUserId =
          currentUser.id ||
          currentUser.userId ||
          Number(localStorage.getItem('userId'));

        if (!currentUserId) {
          setError(t('profUser.errLogin'));
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
          fullName: result?.firstName || '',
          email: result?.email || '',
          phone: result?.phone || '',
          instagram: result?.instagram || '',
          facebook: result?.facebook || '',
          telegram: result?.telegram || '',
          address: result?.address || '',
          photo: result?.photo || '',
        }));

        localStorage.setItem('userId', String(result?.id || currentUserId));
        localStorage.setItem('userName', result?.firstName || '');
        localStorage.setItem('userEmail', result?.email || '');
        localStorage.setItem('userPhone', result?.phone || '');
        localStorage.setItem('userAddress', result?.address || '');
        localStorage.setItem('userInstagram', result?.instagram || '');
        localStorage.setItem('userFacebook', result?.facebook || '');
        localStorage.setItem('userTelegram', result?.telegram || '');
        localStorage.setItem('userPhoto', result?.photo || '');

        localStorage.setItem(
          'user',
          JSON.stringify({
            ...currentUser,
            id: result?.id || currentUserId,
            userId: result?.id || currentUserId,
            role: result?.role || currentUser.role || localStorage.getItem('userRole') || 'user',
            name: result?.firstName || '',
            email: result?.email || '',
            phone: result?.phone || '',
            address: result?.address || '',
            instagram: result?.instagram || '',
            facebook: result?.facebook || '',
            telegram: result?.telegram || '',
            photo: result?.photo || '',
          }),
        );
      } catch (e) {
        console.error(e);
        setError(e.message || t('profUser.errLoad'));
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [t]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        photo: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      photo: '',
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!userId) {
      setError(t('profUser.errUserId'));
      return;
    }

    if (!formData.fullName.trim()) {
      setError(t('profUser.errName'));
      return;
    }

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setError(t('profUser.errPassMatch'));
        return;
      }
    }

    if (!formData.email.trim()) {
      setError(t('profUser.errEmail'));
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError(t('profUser.errPassLen'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('profUser.errPassMismatch'));
      return;
    }

    try {
      const payload = {
        firstName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        instagram: formData.instagram.trim(),
        facebook: formData.facebook.trim(),
        telegram: formData.telegram.trim(),
        photo: formData.photo,
        password: formData.password.trim(),
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

      const currentUser = JSON.parse(localStorage.getItem('user')) || {};

      localStorage.setItem('userId', String(result?.id || userId));
      localStorage.setItem('userName', result?.firstName || '');
      localStorage.setItem('userEmail', result?.email || '');
      localStorage.setItem('userPhone', result?.phone || '');
      localStorage.setItem('userAddress', result?.address || '');
      localStorage.setItem('userInstagram', result?.instagram || '');
      localStorage.setItem('userFacebook', result?.facebook || '');
      localStorage.setItem('userTelegram', result?.telegram || '');
      localStorage.setItem('userPhoto', result?.photo || '');

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...currentUser,
          id: result?.id || userId,
          userId: result?.id || userId,
          role: result?.role || currentUser.role || localStorage.getItem('userRole') || 'user',
          name: result?.firstName || '',
          email: result?.email || '',
          phone: result?.phone || '',
          address: result?.address || '',
          instagram: result?.instagram || '',
          facebook: result?.facebook || '',
          telegram: result?.telegram || '',
          photo: result?.photo || '',
        }),
      );

      setFormData((prev) => ({
        ...prev,
        fullName: result?.firstName || '',
        email: result?.email || '',
        phone: result?.phone || '',
        instagram: result?.instagram || '',
        facebook: result?.facebook || '',
        telegram: result?.telegram || '',
        address: result?.address || '',
        photo: result?.photo || '',
        password: '',
        confirmPassword: '',
      }));

      setMessage(t('profUser.saved'));
    } catch (e) {
      console.error(e);
      setError(e.message || t('profUser.errSave'));
    }
  };

  return (
    <div className="manager-settings-page">
      <header className="settings-hero">
        <div className="settings-header-row">
          <div className="settings-title-block">
            <h1>{t('profUser.title')}</h1>
            <p>{t('profUser.subtitle')}</p>
          </div>
          <div className="settings-header-lang">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="settings-content">
        <form className="settings-form" onSubmit={handleSave}>
          <section className="settings-card logo-card">
            <h2>{t('profUser.photoTitle')}</h2>

            <div className="logo-section">
              <div className="logo-preview">
                {formData.photo ? (
                  <img src={formData.photo} alt="Profile" />
                ) : (
                  <div className="logo-placeholder">
                    <FaCat size={42} />
                  </div>
                )}
              </div>

              <div className="logo-actions">
                <label className="upload-btn">
                  <FiUpload size={16} />
                  {t('profUser.upload')}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
                </label>

                {formData.photo && (
                  <button type="button" className="remove-btn" onClick={handleRemovePhoto}>
                    <FiTrash2 size={16} />
                    {t('profUser.remove')}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h2>{t('profUser.mainInfo')}</h2>

            <div className="settings-grid">
              <div className="field-group">
                <label>{t('profUser.fullName')}</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder={t('profUser.phFullName')}
                />
              </div>

              <div className="field-group">
                <label>{t('profUser.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('profUser.phEmail')}
                />
              </div>

              <div className="field-group">
                <label>{t('profUser.phone')}</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('profUser.phPhone')}
                />
              </div>

              <div className="field-group">
                <label>{t('profUser.city')}</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder={t('profUser.phAddress')}
                />
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h2>{t('profUser.social')}</h2>

            <div className="settings-grid">
              <div className="field-group">
                <label>{t('profUser.insta')}</label>
                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  placeholder={t('profUser.phInsta')}
                />
              </div>

              <div className="field-group">
                <label>{t('profUser.fb')}</label>
                <input
                  type="text"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  placeholder={t('profUser.phFb')}
                />
              </div>

              <div className="field-group full-width">
                <label>{t('profUser.tg')}</label>
                <input
                  type="text"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleChange}
                  placeholder={t('profUser.phTg')}
                />
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h2>{t('profUser.password')}</h2>

            <div className="settings-grid">
              <div className="field-group">
                <label>{t('profUser.newPass')}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('profUser.phNewPass')}
                />
              </div>

              <div className="field-group">
                <label>{t('profUser.confirmPass')}</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('profUser.phConfirmPass')}
                />
              </div>
            </div>
          </section>

          {isLoading && <div className="form-alert">{t('profUser.loading')}</div>}
          {error && <div className="form-alert error-alert">{error}</div>}
          {message && <div className="form-alert success-alert">{message}</div>}

          <div className="form-buttons" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="primary-action-btn" disabled={isLoading}>
              <FiSave size={18} />
              {t('profUser.save')}
            </button>
          </div>
        </form>
      </main>

      <BottomNav active="profile" />
    </div>
  );
};

export default ProfilePage;
