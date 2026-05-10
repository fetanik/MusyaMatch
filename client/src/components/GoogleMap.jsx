/* global google */
import React, { useEffect, useRef } from 'react';

export default function GoogleMap({ pharmacies, center }) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const defaultCenter = {
    lat: 50.4501,
    lng: 30.5234
  };

  const mapCenter = center || defaultCenter;

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
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
  }, [pharmacies, mapCenter]);

  return (
    <div
      ref={mapRef}
      style={{
        height: '400px',
        width: '100%',
        borderRadius: '20px',
        overflow: 'hidden'
      }}
    />
  );
}