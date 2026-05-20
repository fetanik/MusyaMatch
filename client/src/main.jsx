import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const scriptId = 'google-maps-script';

const loadGoogleMapsScript = () => {
  if (!apiKey) {
    console.warn('VITE_GOOGLE_MAPS_API_KEY is missing. Google Maps will not load.');
    window.dispatchEvent(new Event('google-maps-error'));
    return;
  }

  if (document.getElementById(scriptId)) return;

  const script = document.createElement('script');
  script.id = scriptId;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en&region=US`;
  script.async = true;
  script.onload = () => {
    window.dispatchEvent(new Event('google-maps-loaded'));
  };
  script.onerror = () => {
    console.error('Google Maps script failed to load.');
    window.dispatchEvent(new Event('google-maps-error'));
  };

  document.body.appendChild(script);
};

loadGoogleMapsScript();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
