import React from 'react';
import { Cat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isLoggedInClient } from '../utils/clientSession';
import { useI18n } from '../i18n/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import '../styles/HomePage.css';

function Layout({ children, showGuestAuthActions = false, showLanguageSwitcher = false }) {
  const { t } = useI18n();
  const loggedIn = isLoggedInClient();
  const defaultRoute = loggedIn ? '/dashboard' : '/home';
  const showAuth = showGuestAuthActions && !loggedIn;
  const showHeaderTrail = showLanguageSwitcher || showAuth;

  return (
    <div className="home-wrapper">
      <header className="app-header">
        <div className="app-header-brand">
          <Link to={defaultRoute} className="header-logo-link" aria-label={t('layout.homeAria')}>
            <div className="header-logo">
              <Cat color="white" size={28} />
            </div>
          </Link>
          <div className="header-text">
            <Link to={defaultRoute} className="header-title-link">
              <h1>MusyaMatch</h1>
            </Link>
            <p>{t('layout.brandSubtitle')}</p>
          </div>
        </div>
        {showHeaderTrail && (
          <div className="app-header-actions">
            {showLanguageSwitcher && (
              <div className="app-header-lang">
                <LanguageSwitcher />
              </div>
            )}
            {showAuth && (
              <div className="app-header-right">
                <nav className="app-header-auth" aria-label="Account">
                  <Link to="/register?mode=login" className="header-auth-btn header-auth-btn--ghost">
                    {t('layout.login')}
                  </Link>
                  <Link to="/register?mode=signup" className="header-auth-btn header-auth-btn--solid">
                    {t('layout.signup')}
                  </Link>
                </nav>
              </div>
            )}
          </div>
        )}
      </header>

      {children}
    </div>
  );
}

export default Layout;
