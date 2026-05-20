import React, { useEffect, useRef, useState } from 'react';

export default function GoogleMap({ pharmacies, center }) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [loadState, setLoadState] = useState(
    typeof window !== 'undefined' && window.google && window.google.maps ? 'ready' : 'pending'
  );

  const defaultCenter = {
    lat: 50.4501,
    lng: 30.5234
  };

  const mapCenter = center || defaultCenter;

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || typeof window === 'undefined' || typeof google === 'undefined' || !google.maps) {
        return false;
      }

      const map = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: 13,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      // Clear old markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers for each pharmacy
      pharmacies.forEach(pharma => {
        const marker = new google.maps.Marker({
          position: { lat: pharma.coords.lat, lng: pharma.coords.lng },
          map: map,
          title: pharma.name,
          icon: 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png'
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-size: 12px;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px;">${pharma.name}</h3>
              <p style="margin: 0; color: #666;">${pharma.address}</p>
              ${pharma.phone ? `<p style="margin: 0; color: #666;">${pharma.phone}</p>` : ''}
              ${pharma.rating ? `<p style="margin: 0;"><strong>⭐ ${pharma.rating.toFixed(1)}</strong></p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          markersRef.current.forEach(m => m.infoWindow?.close?.());
          infoWindow.open(map, marker);
        });

        marker.infoWindow = infoWindow;
        markersRef.current.push(marker);
      });

      // If we have pharmacies, adjust map to fit all markers
      if (pharmacies.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        pharmacies.forEach(pharma => {
          bounds.extend({ lat: pharma.coords.lat, lng: pharma.coords.lng });
        });
        map.fitBounds(bounds);
      }

      setLoadState('ready');
      return true;
    };

    if (initMap()) return;

    const handleLoaded = () => {
      if (initMap()) {
        setLoadState('ready');
      }
    };

    const handleError = () => {
      setLoadState('error');
    };

    window.addEventListener('google-maps-loaded', handleLoaded);
    window.addEventListener('google-maps-error', handleError);

    return () => {
      window.removeEventListener('google-maps-loaded', handleLoaded);
      window.removeEventListener('google-maps-error', handleError);
    };
  }, [pharmacies, mapCenter]);

  return (
    <div
      ref={mapRef}
      style={{
        height: '400px',
        width: '100%',
        borderRadius: '20px',
        overflow: 'hidden',
        background: '#f0f4f8',
        display: 'grid',
        placeItems: 'center',
        color: '#334155',
        textAlign: 'center',
        padding: '12px'
      }}
    >
      {loadState === 'pending' && <span>Loading map…</span>}
      {loadState === 'error' && (
        <span>
          Map is unavailable.
        </span>
      )}
    </div>
  );
}