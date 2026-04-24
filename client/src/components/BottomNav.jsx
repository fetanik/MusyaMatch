import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, MapPin, Image, Settings } from 'lucide-react';
import '../styles/BottomNav.css';

const getRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    return user.role || 'user';
  } catch {
    return 'user';
  }
};

const BottomNav = ({ active = '' }) => {
  const navigate = useNavigate();
  const role = getRole();

  const items = useMemo(() => {
    if (role === 'manager') {
      return [
        { key: 'home', label: 'Home', icon: Home, to: '/manager/profile' },
        { key: 'gallery', label: 'Cats', icon: Image, to: '/gallery' },
        { key: 'map', label: 'Map', icon: MapPin, to: '/pharmacies' },
        { key: 'profile', label: 'Profile', icon: Settings, to: '/manager/settings' },
      ];
    }

    return [
      { key: 'home', label: 'Home', icon: Home, to: '/dashboard' },
      { key: 'gallery', label: 'Cats', icon: Image, to: '/gallery' },
      { key: 'map', label: 'Map', icon: MapPin, to: '/pharmacies' },
      { key: 'profile', label: 'Profile', icon: User, to: '/profile' },
    ];
  }, [role]);

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
