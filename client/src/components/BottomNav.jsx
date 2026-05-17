import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, MapPin, Image, Settings, ClipboardList, Gift } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import '../styles/BottomNav.css';

const getRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const normalizedRole = String(user.role || '').toLowerCase();
    if (['manager', 'shelter_manager', 'shelter-manager'].includes(normalizedRole)) {
      return 'manager';
    }
    return 'user';
  } catch {
    return 'user';
  }
};

const BottomNav = ({ active = '' }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const role = getRole();

  const items = useMemo(() => {
    if (role === 'manager') {
      return [
        { key: 'home', label: t('nav.home'), icon: Home, to: '/manager/profile' },
        { key: 'requests', label: t('nav.requests'), icon: ClipboardList, to: '/manager/requests' },
        { key: 'gallery', label: t('nav.cats'), icon: Image, to: '/gallery' },
        { key: 'map', label: t('nav.map'), icon: MapPin, to: '/pharmacies' },
        { key: 'profile', label: t('nav.profile'), icon: Settings, to: '/manager/settings' },
      ];
    }

    return [
      { key: 'home', label: t('nav.home'), icon: Home, to: '/dashboard' },
      { key: 'gallery', label: t('nav.cats'), icon: Image, to: '/gallery' },
      { key: 'discounts', label: t('nav.deals'), icon: Gift, to: '/marketplace' },
      { key: 'map', label: t('nav.map'), icon: MapPin, to: '/pharmacies' },
      { key: 'profile', label: t('nav.profile'), icon: User, to: '/profile' },
    ];
  }, [role, t]);

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <button
            key={item.key}
            className={`nav-item ${isActive ? 'active' : ''}`}
            type="button"
            onClick={() => navigate(item.to)}
          >
            <span className="nav-icon">
              <Icon size={20} />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
