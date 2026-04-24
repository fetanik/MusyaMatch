import React, { useState, useEffect, useMemo } from 'react';
import GoogleMap from '../components/GoogleMap';
import '../styles/PharmaciesPage.css';
import BottomNav from '../components/BottomNav';

const ukrainianCities = [
  "Kyiv", "Kharkiv", "Odesa", "Dnipro", "Donetsk", "Zaporizhzhia", "Lviv",
  "Kryvyi Rih", "Mykolaiv", "Mariupol", "Vinnytsia", "Kherson", "Poltava",
  "Chernihiv", "Cherkasy", "Sumy", "Zhytomyr", "Khmelnytskyi", "Rivne",
  "Ternopil", "Ivano-Frankivsk", "Lutsk", "Uzhhorod", "Chernivtsi"
];

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const pharmaciesData = [
  {
    id: 1,
    name: "Happy Paw Pharmacy",
    address: "123 Central Ave, Kyiv",
    city: "Kyiv",
    coords: { lat: 50.4501, lng: 30.5234 },
    phone: "+380 44 123 45 67"
  },
  {
    id: 2,
    name: "VetLife Drugs",
    address: "45 Vet Clinic St, Kyiv",
    city: "Kyiv",
    coords: { lat: 50.4400, lng: 30.5100 },
    phone: "+380 44 987 65 43"
  },
  {
    id: 3,
    name: "Animal Care Pharmacy",
    address: "78 Freedom Square, Lviv",
    city: "Lviv",
    coords: { lat: 49.8397, lng: 24.0297 },
    phone: "+380 32 123 45 67"
  },
  {
    id: 4,
    name: "Pet Health Center",
    address: "15 Deribasovskaya St, Odesa",
    city: "Odesa",
    coords: { lat: 46.4825, lng: 30.7233 },
    phone: "+380 48 987 65 43"
  },
  {
    id: 5,
    name: "VetPlus Pharmacy",
    address: "22 Sumskaya St, Kharkiv",
    city: "Kharkiv",
    coords: { lat: 49.9935, lng: 36.2304 },
    phone: "+380 57 123 45 67"
  },
  {
    id: 6,
    name: "Cat & Dog Care",
    address: "9 Dnipro St, Dnipro",
    city: "Dnipro",
    coords: { lat: 48.4647, lng: 35.0462 },
    phone: "+380 56 987 65 43"
  }
];

const PharmaciesPage = () => {
  const [selectedPharma, setSelectedPharma] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const [cityFilter, setCityFilter] = useState('');
  const [nameSort, setNameSort] = useState('none'); 
  const [distanceSort, setDistanceSort] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Failed to get location:', error);
        }
      );
    }
  }, []);

  const filteredPharmacies = useMemo(() => {
    let filtered = pharmaciesData;

    if (cityFilter) {
      filtered = filtered.filter(pharma =>
        pharma.city.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    if (nameSort === 'az') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (nameSort === 'za') {
      filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
    }

    if (distanceSort && userLocation) {
      filtered = [...filtered].sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.coords.lat, a.coords.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.coords.lat, b.coords.lng);
        return distA - distB;
      });
    }

    return filtered;
  }, [cityFilter, nameSort, distanceSort, userLocation]);

  return (
    <div className="pharmacies-page">
      <div className="header-section">
        <h2 className="title">Vet Pharmacies</h2>
        <p className="subtitle">Find the best care for your cat 🐾</p>

        <div className="filters-section">
          <div className="filter-group">
            <label>City:</label>
            <input
              type="text"
              list="cities"
              placeholder="Select or type a city..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="city-input"
            />
            <datalist id="cities">
              <option value="" />
              {ukrainianCities.map(city => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>

          <div className="filter-group">
            <label>Sort by name:</label>
            <select
              value={nameSort}
              onChange={(e) => setNameSort(e.target.value)}
              className="sort-select"
            >
              <option value="none">No sorting</option>
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
            </select>
          </div>

          {userLocation && (
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={distanceSort}
                  onChange={(e) => setDistanceSort(e.target.checked)}
                />
                Sort by distance
              </label>
            </div>
          )}
        </div>
      </div>

      <main className="map-section">
        <GoogleMap pharmacies={filteredPharmacies} center={selectedPharma?.coords || userLocation} />
      </main>

      <div className="pharmacies-list">
        {filteredPharmacies.map(pharma => {
          const distance = userLocation ?
            calculateDistance(userLocation.lat, userLocation.lng, pharma.coords.lat, pharma.coords.lng).toFixed(1) :
            null;

          return (
            <div
              key={pharma.id}
              className={`pharma-item ${selectedPharma?.id === pharma.id ? 'active' : ''}`}
              onClick={() => setSelectedPharma(pharma)}
            >
              <h3>{pharma.name}</h3>
              <p>{pharma.address}</p>
              <span className="phone">{pharma.phone}</span>
              {distance && <span className="distance">Distance: {distance} km</span>}
              <button className="btn-directions" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pharma.coords.lat},${pharma.coords.lng}`)}>
                Get Directions
              </button>
            </div>
          );
        })}
      </div>
      <BottomNav active="map" />
    </div>
  );
};

export default PharmaciesPage;