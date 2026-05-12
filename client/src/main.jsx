import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const scriptId = 'google-maps-script';
if (apiKey && !document.getElementById(scriptId)) {
  const script = document.createElement('script');
  script.id = scriptId;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en&region=US`;
  script.async = true;
  document.body.appendChild(script);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
