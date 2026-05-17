import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ManagerSettingsPage.css';
import BottomNav from '../components/BottomNav';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/I18nContext';

import {
  FiArrowLeft,
  FiUpload,
  FiTrash2,
  FiSave,
} from 'react-icons/fi';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/shelter`;

const ManagerSettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

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
        setError(e.message || t('profMgr.errLoad'));
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
      setError(t('profUser.errUserId'));
      return;
    }

    if (!formData.shelterName.trim()) {
      setError(t('profMgr.errShelter'));
      return;
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

      setMessage(t('profMgr.saved'));
    } catch (e) {
      console.error(e);
      setError(e.message || t('profMgr.errSave'));
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
            aria-label={t('common.back')}
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="settings-title-block">
            <h1>{t('profMgr.title')}</h1>
            <p>{t('profMgr.subtitle')}</p>
          </div>

          <div className="settings-header-lang">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="settings-content">
        <form className="settings-form" onSubmit={handleSave}>
          <section className="settings-card logo-card">
            <h2>{t('profMgr.logoTitle')}</h2>

            <div className="logo-section">
              <div className="logo-preview">
                {formData.logo ? (
                  <img src={formData.logo} alt={t('profMgr.logoAlt')} />
                ) : (
                  <div className="logo-placeholder">
                    <span>{t('profMgr.noLogo')}</span>
                  </div>
                )}
              </div>

              <div className="logo-actions">
                <label className="upload-btn">
                  <FiUpload size={16} />
                  {t('profMgr.uploadLogo')}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
                </label>

                {formData.logo && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={handleRemoveLogo}
                  >
                    <FiTrash2 size={16} />
                    {t('profUser.remove')}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h2>{t('profMgr.mainInfo')}</h2>

            <div className="settings-grid">
              <div className="field-group">
                <label>{t('profMgr.shelterName')}</label>
                <input
                  type="text"
                  name="shelterName"
                  value={formData.shelterName}
                  onChange={handleChange}
                  placeholder={t('profMgr.phShelter')}
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
                <label>{t('profMgr.address')}</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder={t('profMgr.phAddress')}
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
            <h2>{t('profMgr.descTitle')}</h2>

            <div className="field-group">
              <label>{t('profMgr.aboutLabel')}</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                placeholder={t('profMgr.aboutPh')}
              />
            </div>

            <div className="field-group">
              <label>{t('profMgr.adoptLabel')}</label>
              <textarea
                name="adoptionConditions"
                value={formData.adoptionConditions}
                onChange={handleChange}
                rows="5"
                placeholder={t('profMgr.adoptPh')}
              />
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

          {isLoading && <div className="form-alert">{t('profMgr.loading')}</div>}
          {error && <div className="form-alert error-alert">{error}</div>}
          {message && <div className="form-alert success-alert">{message}</div>}

          <div className="form-buttons">
            <button
              type="button"
              className="secondary-action-btn"
              onClick={() => navigate('/manager/profile')}
            >
              {t('profMgr.backDash')}
            </button>

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

export default ManagerSettingsPage;
