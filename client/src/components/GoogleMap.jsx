import React, { useEffect, useRef, useState } from 'react';

export default function GoogleMap({ pharmacies, center }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [loadState, setLoadState] = useState(
    typeof window !== 'undefined' && window.google && window.google.maps ? 'ready' : 'pending'
  );
  const [mapError, setMapError] = useState(false);

  const defaultCenter = {
    lat: 50.4501,
    lng: 30.5234
  };

  const mapCenter = center || defaultCenter;

  const createMap = () => {
    if (
      mapInstanceRef.current ||
      !mapRef.current ||
      typeof window === 'undefined' ||
      typeof google === 'undefined' ||
      !google.maps
    ) {
      return false;
    }

    try {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: 13,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      return true;
    } catch (err) {
      console.error('Google Maps initialization failed:', err);
      setMapError(true);
      return false;
    }
  };

  const updateMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === 'undefined' || !google.maps) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    pharmacies.forEach(pharma => {
      const marker = new google.maps.Marker({
        position: { lat: pharma.coords.lat, lng: pharma.coords.lng },
        map,
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

    if (pharmacies.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      pharmacies.forEach(pharma => {
        bounds.extend({ lat: pharma.coords.lat, lng: pharma.coords.lng });
      });
      map.fitBounds(bounds);
    }
  };

  useEffect(() => {
    const handleLoaded = () => {
      setLoadState('ready');
    };

    const handleError = () => {
      setLoadState('error');
      setMapError(true);
    };

    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      setLoadState('ready');
    }

    window.addEventListener('google-maps-loaded', handleLoaded);
    window.addEventListener('google-maps-error', handleError);

    return () => {
      window.removeEventListener('google-maps-loaded', handleLoaded);
      window.removeEventListener('google-maps-error', handleError);
    };
  }, []);

  useEffect(() => {
    if (loadState !== 'ready') return;
    const mapCreated = createMap();
    if (mapCreated || mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(mapCenter);
      updateMarkers();
    }
  }, [loadState, pharmacies, mapCenter]);

  const lat = mapCenter.lat;
  const lng = mapCenter.lng;
  const osmIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05}%2C${lat - 0.03}%2C${lng + 0.05}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`;

  if (loadState === 'error' || mapError) {
    return (
      <div
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
        }}
      >
        <iframe
          title="Fallback map"
          src={osmIframeUrl}
          style={{ border: 0, width: '100%', height: '100%' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

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
    </div>
  );
}