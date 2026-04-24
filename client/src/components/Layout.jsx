import React from 'react';
import { Cat } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/HomePage.css';

function Layout({ children }) {
  return (
    <div className="home-wrapper">
      <header className="app-header">
        <div className="app-header-brand">
          <Link to="/home" className="header-logo-link" aria-label="На головну">
            <div className="header-logo">
              <Cat color="white" size={28} />
            </div>
          </Link>
          <div className="header-text">
            <Link to="/" className="header-title-link">
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
