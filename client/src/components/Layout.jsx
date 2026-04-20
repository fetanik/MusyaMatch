import React from 'react';
import { Cat } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/HomePage.css';

function Layout({ children }) {
  const isRegistered = localStorage.getItem('musyamatch_is_registered') === 'true';
  const defaultRoute = isRegistered ? '/dashboard' : '/home';

  return (
    <div className="home-wrapper">
      <header className="app-header">
        <div className="app-header-brand">
          <Link to={defaultRoute} className="header-logo-link" aria-label="На головну">
            <div className="header-logo">
              <Cat color="white" size={28} />
            </div>
          </Link>
          <div className="header-text">
            <Link to={defaultRoute} className="header-title-link">
              <h1>MusyaMatch</h1>
            </Link>
            <p>Cat Adoption & Care</p>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

export default Layout;
