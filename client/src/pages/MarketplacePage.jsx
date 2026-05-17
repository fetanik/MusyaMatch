import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { AlertCircle, Zap } from 'lucide-react';
import Layout from '../components/Layout';
import '../styles/MarketplacePage.css';
import { apiUrl } from '../utils/apiUrl';
import { useI18n } from '../i18n/I18nContext';

const getNumericUserId = (user) => {
  const raw = user?.id ?? user?.userId;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const MarketplacePage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeemingId, setRedeemingId] = useState(null);
  const [successPromoCode, setSuccessPromoCode] = useState('');
  const [shelterNeeds, setShelterNeeds] = useState([]);
  const [isLoadingShelterNeeds, setIsLoadingShelterNeeds] = useState(false);

  const discounts = useMemo(
    () => [
      { id: 1, partner: 'MasterZoo', descriptionKey: 'market.d1desc', points: 500, icon: '🎁' },
      {
        id: 2,
        partner: 'Vet Clinic "Healthy Cat"',
        descriptionKey: 'market.d2desc',
        points: 1000,
        icon: '🏥',
      },
      { id: 3, partner: 'PetShop "Murkosha"', descriptionKey: 'market.d3desc', points: 800, icon: '🛍️' },
      { id: 4, partner: 'Cat Hotel "Magic Home"', descriptionKey: 'market.d4desc', points: 1200, icon: '🏠' },
      { id: 5, partner: 'Photo Studio "Fluffy"', descriptionKey: 'market.d5desc', points: 600, icon: '📸' },
    ],
    [],
  );

  // Get current user
  const getCurrentUser = () => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Load user points
  const fetchPointsBalance = async ({ showPageLoading = false } = {}) => {
    try {
      if (showPageLoading) {
        setLoading(true);
      }
      const user = getCurrentUser();
      const uid = getNumericUserId(user);
      if (!uid) {
        setError(t('market.errLogin'));
        return;
      }

      const response = await fetch(apiUrl(`/api/achievements/${uid}/summary`));
      if (response.ok) {
        const data = await response.json();
        setUserPoints(Number(data.points) || 0);
        setError('');
      } else {
        setError(t('market.errPoints'));
      }
    } catch (err) {
      console.error('Error loading points:', err);
      setError(t('market.errData'));
    } finally {
      if (showPageLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPointsBalance({ showPageLoading: true });
  }, []);

  // Load shelter needs
  useEffect(() => {
    const loadShelterNeeds = async () => {
      setIsLoadingShelterNeeds(true);
      try {
        const response = await fetch(apiUrl('/api/needs'));
        if (response.ok) {
          const data = await response.json();
          const openNeeds = (Array.isArray(data) ? data : [])
            .filter((need) => need.status === 'open')
            .slice(0, 5); // Show top 5 needs
          setShelterNeeds(openNeeds);
        } else {
          setShelterNeeds([]);
        }
      } catch (err) {
        console.error('Error loading shelter needs:', err);
        setShelterNeeds([]);
      } finally {
        setIsLoadingShelterNeeds(false);
      }
    };

    loadShelterNeeds();
  }, []);

  const handleRedeem = async (discount) => {
    const user = getCurrentUser();
    const uid = getNumericUserId(user);
    if (!uid) {
      setError(t('market.errLogin'));
      return;
    }

    if (userPoints < discount.points) {
      setError(t('market.errNotEnough', { need: discount.points, have: userPoints }));
      return;
    }

    setRedeemingId(discount.id);
    setError('');
    try {
      const payload = {
        userId: uid,
        partner_name: discount.partner,
        points: discount.points,
      };

      let response = await fetch(apiUrl('/api/marketplace/redeem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 404) {
        response = await fetch(apiUrl(`/api/achievements/${uid}/redeem`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.status === 404) {
        response = await fetch(apiUrl('/api/achievements/redeem'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setSuccessPromoCode(data.promo_code || 'MUSYA2026');
        setError('');
        try {
          await fetchPointsBalance({ showPageLoading: false });
        } catch (balErr) {
          console.error('Balance refresh after redeem:', balErr);
        }
        setTimeout(() => setSuccessPromoCode(''), 5000);
      } else {
        const msg =
          data?.message ||
          (response.status
            ? `Redeem failed (HTTP ${response.status})`
            : t('market.errRedeem'));
        setError(msg);
      }
    } catch (err) {
      console.error('Redeem error:', err);
      const net =
        err?.message === 'Failed to fetch' || err?.name === 'TypeError'
          ? 'Cannot reach API. Start the backend and check VITE_API_BASE_URL / proxy.'
          : null;
      setError(net || err?.message || t('market.errRedeem'));
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="marketplace-container">
          <div className="loading">{t('market.loading')}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="marketplace-container">
        <header className="marketplace-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft size={24} />
          </button>
          <h1>{t('market.title')}</h1>
          <div className="spacer" />
        </header>

        {/* Points Balance Card */}
        <div className="points-balance-card">
          <div className="points-icon">✨</div>
          <h2>{t('market.pointsTitle')}</h2>
          <div className="points-amount">{userPoints}</div>
          <p className="points-subtitle">{t('market.pointsSub')}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successPromoCode && (
          <div className="success-modal">
            <div className="success-content">
              <div className="success-icon">
                <FiCheck size={48} />
              </div>
              <h3>{t('market.redeemedTitle')}</h3>
              <p>{t('market.promoLabel')}</p>
              <div className="promo-code">{successPromoCode}</div>
              <p className="promo-hint">{t('market.promoHint')}</p>
            </div>
          </div>
        )}

        {/* Discounts Section */}
        <section className="discounts-section">
          <h3>{t('market.offersTitle')}</h3>
          <div className="discounts-grid">
            {discounts.map((discount) => (
              <div key={discount.id} className="discount-card">
                <div className="discount-icon">{discount.icon}</div>
                <h4>{discount.partner}</h4>
                <p className="discount-description">{t(discount.descriptionKey)}</p>
                <div className="discount-points">
                  <Zap size={16} />
                  {discount.points} {t('market.pointsWord')}
                </div>
                <button
                  className={`redeem-btn ${userPoints < discount.points ? 'disabled' : ''}`}
                  onClick={() => handleRedeem(discount)}
                  disabled={userPoints < discount.points || redeemingId === discount.id}
                >
                  {redeemingId === discount.id ? t('market.processing') : t('market.redeem')}
                </button>
                {userPoints < discount.points && (
                  <p className="insufficient-points">
                    {t('market.needMore', { n: discount.points - userPoints })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Shelter Needs Section */}
        {shelterNeeds.length > 0 && (
          <section className="shelter-needs-section">
            <h3>{t('market.helpShelters')}</h3>
            <p className="section-subtitle">{t('market.helpSheltersSub')}</p>
            <div className="needs-list">
              {shelterNeeds.map((need) => (
                <div key={need.id} className="need-item">
                  <div className="need-header">
                    <h4>{need.title}</h4>
                    <span className={`priority-badge priority-${need.priority}`}>
                      {need.priority === 'high' && t('market.pHigh')}
                      {need.priority === 'medium' && t('market.pMedium')}
                      {need.priority === 'low' && t('market.pLow')}
                    </span>
                  </div>
                  <p className="need-description">{need.description}</p>
                  {need.shelter && (
                    <div className="need-shelter">
                      <strong>{need.shelter.name}</strong>
                      {need.shelter.address && <p>{need.shelter.address}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Info Section */}
        <section className="info-section">
          <h3>{t('market.howTitle')}</h3>
          <div className="info-steps">
            <div className="info-step">
              <div className="step-number">1</div>
              <h4>{t('market.step1Title')}</h4>
              <p>{t('market.step1Desc')}</p>
            </div>
            <div className="info-step">
              <div className="step-number">2</div>
              <h4>{t('market.step2Title')}</h4>
              <p>{t('market.step2Desc')}</p>
            </div>
            <div className="info-step">
              <div className="step-number">3</div>
              <h4>{t('market.step3Title')}</h4>
              <p>{t('market.step3Desc')}</p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default MarketplacePage;
