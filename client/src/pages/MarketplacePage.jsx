import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { Gift, AlertCircle, Zap } from 'lucide-react';
import Layout from '../components/Layout';
import '../styles/MarketplacePage.css';

const getApiBaseUrl = () => {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!rawBase) {
    return '/api';
  }
  return rawBase.replace(/\/+$/, '').replace(/\/api$/i, '') + '/api';
};

const API_BASE_URL = getApiBaseUrl();

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeemingId, setRedeemingId] = useState(null);
  const [successPromoCode, setSuccessPromoCode] = useState('');
  const [shelterNeeds, setShelterNeeds] = useState([]);
  const [isLoadingShelterNeeds, setIsLoadingShelterNeeds] = useState(false);

  const discounts = [
    {
      id: 1,
      partner: 'MasterZoo',
      description: '15% off food and accessories',
      points: 500,
      icon: '🎁',
    },
    {
      id: 2,
      partner: 'Vet Clinic "Healthy Cat"',
      description: 'Free consultation visit',
      points: 1000,
      icon: '🏥',
    },
    {
      id: 3,
      partner: 'PetShop "Murkosha"',
      description: '20% off all products',
      points: 800,
      icon: '🛍️',
    },
    {
      id: 4,
      partner: 'Cat Hotel "Magic Home"',
      description: '30% off boarding service',
      points: 1200,
      icon: '🏠',
    },
    {
      id: 5,
      partner: 'Photo Studio "Fluffy"',
      description: '25% off a cat photoshoot',
      points: 600,
      icon: '📸',
    },
  ];

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
  useEffect(() => {
    const loadUserPoints = async () => {
      try {
        const user = getCurrentUser();
        if (!user?.id) {
          setError('You are not logged in');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/achievements/${user.id}/summary`);
        if (response.ok) {
          const data = await response.json();
          setUserPoints(data.points || 0);
        } else {
          setError('Failed to load points balance');
        }
      } catch (err) {
        console.error('Error loading points:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadUserPoints();
  }, []);

  // Load shelter needs
  useEffect(() => {
    const loadShelterNeeds = async () => {
      setIsLoadingShelterNeeds(true);
      try {
        const response = await fetch(`${API_BASE_URL}/needs`);
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
    if (!user?.id) {
      setError('You are not logged in');
      return;
    }

    if (userPoints < discount.points) {
      setError(
        `Not enough points. You need ${discount.points}, you have ${userPoints}.`
      );
      return;
    }

    setRedeemingId(discount.id);
    try {
      const response = await fetch(`${API_BASE_URL}/achievements/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          partner_name: discount.partner,
          points: discount.points,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserPoints(Number(data.new_balance ?? userPoints - discount.points));
        setSuccessPromoCode(data.promo_code || 'MUSYA2026');
        setError('');
        setTimeout(() => setSuccessPromoCode(''), 5000);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to redeem points');
      }
    } catch (err) {
      console.error('Redeem error:', err);
      setError('Failed to redeem points');
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="marketplace-container">
          <div className="loading">Loading...</div>
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
          <h1>Discounts</h1>
          <div className="spacer" />
        </header>

        {/* Points Balance Card */}
        <div className="points-balance-card">
          <div className="points-icon">✨</div>
          <h2>Your points balance</h2>
          <div className="points-amount">{userPoints}</div>
          <p className="points-subtitle">Redeem your points for partner discounts</p>
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
              <h3>Redeemed successfully!</h3>
              <p>Your promo code:</p>
              <div className="promo-code">{successPromoCode}</div>
              <p className="promo-hint">Show this code to the partner at checkout</p>
            </div>
          </div>
        )}

        {/* Discounts Section */}
        <section className="discounts-section">
          <h3>Available offers</h3>
          <div className="discounts-grid">
            {discounts.map((discount) => (
              <div key={discount.id} className="discount-card">
                <div className="discount-icon">{discount.icon}</div>
                <h4>{discount.partner}</h4>
                <p className="discount-description">{discount.description}</p>
                <div className="discount-points">
                  <Zap size={16} />
                  {discount.points} points
                </div>
                <button
                  className={`redeem-btn ${userPoints < discount.points ? 'disabled' : ''}`}
                  onClick={() => handleRedeem(discount)}
                  disabled={userPoints < discount.points || redeemingId === discount.id}
                >
                  {redeemingId === discount.id ? 'Processing...' : 'Redeem'}
                </button>
                {userPoints < discount.points && (
                  <p className="insufficient-points">
                    You need {discount.points - userPoints} more points
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Shelter Needs Section */}
        {shelterNeeds.length > 0 && (
          <section className="shelter-needs-section">
            <h3>Help shelters</h3>
            <p className="section-subtitle">
              Current open requests from shelters
            </p>
            <div className="needs-list">
              {shelterNeeds.map((need) => (
                <div key={need.id} className="need-item">
                  <div className="need-header">
                    <h4>{need.title}</h4>
                    <span className={`priority-badge priority-${need.priority}`}>
                      {need.priority === 'high' && '🔴 High'}
                      {need.priority === 'medium' && '🟡 Medium'}
                      {need.priority === 'low' && '🟢 Low'}
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
          <h3>How it works</h3>
          <div className="info-steps">
            <div className="info-step">
              <div className="step-number">1</div>
              <h4>Earn points</h4>
              <p>Complete tasks and collect points for your activity</p>
            </div>
            <div className="info-step">
              <div className="step-number">2</div>
              <h4>Choose an offer</h4>
              <p>Pick a partner discount you like</p>
            </div>
            <div className="info-step">
              <div className="step-number">3</div>
              <h4>Redeem a promo code</h4>
              <p>Redeem your points and use the promo code at checkout</p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default MarketplacePage;
