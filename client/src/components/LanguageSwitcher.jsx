import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import './LanguageSwitcher.css';

function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={`lang-switch ${className}`.trim()}
      role="group"
      aria-label={t('layout.langGroup')}
    >
      <button
        type="button"
        className={locale === 'en' ? 'active' : ''}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={locale === 'uk' ? 'active' : ''}
        onClick={() => setLocale('uk')}
      >
        UA
      </button>
    </div>
  );
}

export default LanguageSwitcher;
