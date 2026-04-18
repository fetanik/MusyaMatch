import React from 'react';
import GoogleMapReact from 'google-map-react';

const AnyReactComponent = ({ text }) => (
  <div style={{
    color: 'white', 
    background: '#ffb347',
    padding: '7px 12px',
    borderRadius: '20px',
    display: 'inline-flex',
    fontWeight: 'bold',
    fontSize: '12px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  }}>
    {text}
  </div>
);

export default function GoogleMap({ pharmacies, center }){
  const defaultProps = {
    center: {
      lat: 50.4501, 
      lng: 30.5234
    },
    zoom: 11
  };

  const mapCenter = center || defaultProps.center;

  return (
    <div style={{ height: '400px', width: '100%', borderRadius: '20px', overflow: 'hidden' }}>
      <GoogleMapReact
        bootstrapURLKeys={{ 
          key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          language: "en" 
        }}
        center={mapCenter}
        defaultZoom={defaultProps.zoom}
      >
        {pharmacies.map(pharma => (
          <AnyReactComponent
            key={pharma.id}
            lat={pharma.coords.lat}
            lng={pharma.coords.lng}
            text={pharma.name}
          />
        ))}
      </GoogleMapReact>
    </div>
  );
}