/* global google */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import GoogleMap from '../components/GoogleMap';
import '../styles/PharmaciesPage.css';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';
import { useI18n } from '../i18n/I18nContext';

const ukrainianCities = {
  "Kyiv": { lat: 50.4501, lng: 30.5234, radius: 15000 },
  "Kharkiv": { lat: 49.9935, lng: 36.2304, radius: 15000 },
  "Odesa": { lat: 46.4825, lng: 30.7233, radius: 15000 },
  "Dnipro": { lat: 48.4647, lng: 35.0462, radius: 15000 },
  "Lviv": { lat: 49.8397, lng: 24.0297, radius: 15000 },
  "Kryvyi Rih": { lat: 47.9095, lng: 33.3845, radius: 15000 },
  "Mykolaiv": { lat: 46.9753, lng: 31.9946, radius: 15000 },
  "Vinnytsia": { lat: 49.2331, lng: 28.4682, radius: 15000 },
  "Kherson": { lat: 46.6354, lng: 32.6169, radius: 15000 },
  "Poltava": { lat: 49.5992, lng: 34.5514, radius: 15000 },
  "Chernihiv": { lat: 51.4981, lng: 31.2893, radius: 15000 },
  "Cherkasy": { lat: 49.4270, lng: 32.0624, radius: 15000 },
  "Sumy": { lat: 50.9055, lng: 34.7988, radius: 15000 },
  "Zhytomyr": { lat: 50.2547, lng: 28.6597, radius: 15000 },
  "Khmelnytskyi": { lat: 49.4144, lng: 27.0014, radius: 15000 },
  "Rivne": { lat: 50.6231, lng: 26.2297, radius: 15000 },
  "Ternopil": { lat: 49.5535, lng: 25.5924, radius: 15000 },
  "Ivano-Frankivsk": { lat: 48.9226, lng: 24.7098, radius: 15000 },
  "Lutsk": { lat: 50.7465, lng: 25.3434, radius: 15000 },
  "Uzhhorod": { lat: 48.6208, lng: 22.2879, radius: 15000 },
  "Chernivtsi": { lat: 48.2910, lng: 25.9352, radius: 15000 }
};

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

// Fallback pharmacies data if Places API fails
const fallbackPharmaciesData = [
  {
    id: 1,
    name: "Happy Paw Pharmacy",
    address: "123 Central Ave, Kyiv",
    city: "Kyiv",
    coords: { lat: 50.4501, lng: 30.5234 },
    phone: "+380 44 123 45 67",
    rating: 4.5,
    isOpen: true
  },
  {
    id: 2,
    name: "VetLife Drugs",
    address: "45 Vet Clinic St, Kyiv",
    city: "Kyiv",
    coords: { lat: 50.4400, lng: 30.5100 },
    phone: "+380 44 987 65 43",
    rating: 4.8,
    isOpen: true
  },
  {
    id: 3,
    name: "Animal Care Pharmacy",
    address: "78 Freedom Square, Lviv",
    city: "Lviv",
    coords: { lat: 49.8397, lng: 24.0297 },
    phone: "+380 32 123 45 67",
    rating: 4.6,
    isOpen: false
  },
  {
    id: 4,
    name: "Pet Health Center",
    address: "15 Deribasovskaya St, Odesa",
    city: "Odesa",
    coords: { lat: 46.4825, lng: 30.7233 },
    phone: "+380 48 987 65 43",
    rating: 4.3,
    isOpen: true
  },
  {
    id: 5,
    name: "VetPlus Pharmacy",
    address: "22 Sumskaya St, Kharkiv",
    city: "Kharkiv",
    coords: { lat: 49.9935, lng: 36.2304 },
    phone: "+380 57 123 45 67",
    rating: 4.7,
    isOpen: true
  },
  {
    id: 6,
    name: "Cat & Dog Care",
    address: "9 Dnipro St, Dnipro",
    city: "Dnipro",
    coords: { lat: 48.4647, lng: 35.0462 },
    phone: "+380 56 987 65 43",
    rating: 4.4,
    isOpen: false
  }
];

const PharmaciesPage = () => {
  const { notify } = useMessages();
  const { t } = useI18n();
  const [pharmacies, setPharmacies] = useState(fallbackPharmaciesData);
  const [selectedPharma, setSelectedPharma] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [cityFilter, setCityFilter] = useState('');
  const [nameSort, setNameSort] = useState('none');
  const [distanceSort, setDistanceSort] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [minRating, setMinRating] = useState(0);

  const placesServiceRef = useRef(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(
    typeof window !== 'undefined' &&
      window.google &&
      window.google.maps &&
      window.google.maps.places
  );

  // Initialize Places Service when Google Maps API is ready
  useEffect(() => {
    const initPlacesService = () => {
      if (typeof window === 'undefined' || typeof google === 'undefined' || !google.maps || !google.maps.places) {
        return false;
      }

      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '0';
      tempDiv.style.height = '0';
      document.body.appendChild(tempDiv);

      const tempMap = new google.maps.Map(tempDiv, {
        center: { lat: 50.4501, lng: 30.5234 },
        zoom: 10
      });
      placesServiceRef.current = new google.maps.places.PlacesService(tempMap);
      setGoogleMapsLoaded(true);
      document.body.removeChild(tempDiv);

      return true;
    };

    initPlacesService();

    const handleLoaded = () => initPlacesService();
    window.addEventListener('google-maps-loaded', handleLoaded);

    return () => {
      window.removeEventListener('google-maps-loaded', handleLoaded);
    };
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          notify(t('pharm.locFoundBody'), {
            type: 'success',
            title: t('pharm.locFoundTitle'),
            autoCloseMs: 2000
          });
        },
        (error) => {
          console.log('Failed to get location:', error);
          notify(t('pharm.locDeniedBody'), {
            type: 'info',
            title: t('pharm.locDeniedTitle'),
            autoCloseMs: 3000
          });
        }
      );
    }
  }, [notify, t]);

  // Search for pharmacies using Places API
  useEffect(() => {
    const searchPharmacies = async () => {
      // Priority 1: City filter (15km radius) - User explicitly selected a city
      if (cityFilter && placesServiceRef.current) {
        setIsLoading(true);

        try {
          const cityData = ukrainianCities[cityFilter];

          if (!cityData) {
            console.error('City not found:', cityFilter);
            setPharmacies(fallbackPharmaciesData);
            setIsLoading(false);
            return;
          }

          const request = {
            location: new google.maps.LatLng(cityData.lat, cityData.lng),
            radius: cityData.radius,
            type: 'pharmacy',
            keyword: 'veterinary pet animal'
          };

          console.log('Searching pharmacies in city:', cityFilter, request);

          placesServiceRef.current.nearbySearch(request, (results, status) => {
            console.log('PlacesService response:', status, results?.length);

            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              const pharmaResults = results.slice(0, 20).map((place, index) => ({
                id: place.place_id || `${index}-${place.name}`,
                name: place.name,
                address: place.vicinity || place.formatted_address || t('pharm.addrNA'),
                city: cityFilter,
                coords: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                },
                phone:
                  place.formatted_phone_number ||
                  place.international_phone_number ||
                  t('pharm.phoneNA'),
                placeId: place.place_id,
                isOpen: place.opening_hours?.isOpen(),
                rating: place.rating || null,
                status: place.business_status
              }));

              console.log('Found pharmacies in city:', pharmaResults.length);
              setPharmacies(pharmaResults);
              notify(t('pharm.foundInCity', { count: pharmaResults.length, city: cityFilter }), {
                type: 'success',
                title: t('pharm.searchResults'),
                autoCloseMs: 2000
              });
            } else {
              console.log('No pharmacies found in city');
              setPharmacies(fallbackPharmaciesData);
              notify(t('pharm.noInCity', { city: cityFilter }), {
                type: 'info',
                title: t('pharm.noResults'),
                autoCloseMs: 3000
              });
            }
            setIsLoading(false);
          });
        } catch (error) {
          console.error('Search error:', error);
          setPharmacies(fallbackPharmaciesData);
          notify(t('pharm.errSearch'), {
            type: 'error',
            title: t('pharm.searchError'),
          });
          setIsLoading(false);
        }

        return;
      }

      // Priority 2: User location (3km radius)
      if (userLocation && placesServiceRef.current) {
        setIsLoading(true);

        try {
          const request = {
            location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
            radius: 3000, // 3km
            type: 'pharmacy',
            keyword: 'veterinary pet animal'
          };

          console.log('Searching nearby pharmacies from user location:', request);

          placesServiceRef.current.nearbySearch(request, (results, status) => {
            console.log('PlacesService response:', status, results?.length);

            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              const pharmaResults = results.slice(0, 20).map((place, index) => ({
                id: place.place_id || `${index}-${place.name}`,
                name: place.name,
                address: place.vicinity || place.formatted_address || t('pharm.addrNA'),
                city: t('pharm.yourArea'),
                coords: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                },
                phone:
                  place.formatted_phone_number ||
                  place.international_phone_number ||
                  t('pharm.phoneNA'),
                placeId: place.place_id,
                isOpen: place.opening_hours?.isOpen(),
                rating: place.rating || null,
                status: place.business_status
              }));

              console.log('Found pharmacies near user:', pharmaResults.length);
              setPharmacies(pharmaResults);
              notify(t('pharm.foundNear', { count: pharmaResults.length }), {
                type: 'success',
                title: t('pharm.searchResults'),
                autoCloseMs: 2000
              });
            } else {
              console.log('No pharmacies found nearby. Showing alternatives.');
              setPharmacies(fallbackPharmaciesData);
              notify(t('pharm.noNearby'), {
                type: 'info',
                title: t('pharm.noResults'),
                autoCloseMs: 3000
              });
            }
            setIsLoading(false);
          });
        } catch (error) {
          console.error('Search error:', error);
          setPharmacies(fallbackPharmaciesData);
          notify(t('pharm.errSearch'), {
            type: 'error',
            title: t('pharm.searchError'),
          });
          setIsLoading(false);
        }

        return;
      }

      // No location and no city selected
      if (!userLocation && !cityFilter) {
        setPharmacies(fallbackPharmaciesData);
      }
    };

    searchPharmacies();
  }, [cityFilter, userLocation, notify, t, googleMapsLoaded]);

  const filteredPharmacies = useMemo(() => {
    let filtered = pharmacies;

    // Filter by status
    if (statusFilter === 'open') {
      filtered = filtered.filter(pharma => pharma.isOpen === true);
    }

    // Filter by rating
    if (minRating > 0) {
      filtered = filtered.filter(pharma => (pharma.rating || 0) >= minRating);
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
  }, [pharmacies, nameSort, distanceSort, userLocation, statusFilter, minRating]);

  return (
    <div className="pharmacies-page">
      <div className="header-section">
        <h2 className="title">{t('pharm.title')}</h2>
        <p className="subtitle">{t('pharm.subtitle')}</p>

        <div className="filters-section">
          <div className="filter-group">
            <label>{t('pharm.cityLabel')}</label>
            <input
              type="text"
              list="cities"
              placeholder={t('pharm.cityPh')}
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="city-input"
              disabled={isLoading}
            />
            <datalist id="cities">
              <option value="" />
              {Object.keys(ukrainianCities).map(city => (
                <option key={city} value={city} />
              ))}
            </datalist>
            {isLoading && <span className="loading-indicator">{t('pharm.searching')}</span>}
          </div>

          <div className="filter-group">
            <label>{t('pharm.minRating')}</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="sort-select"
              disabled={isLoading}
            >
              <option value="0">{t('pharm.anyRating')}</option>
              <option value="3">3.0+ ⭐</option>
              <option value="3.5">3.5+ ⭐</option>
              <option value="4">4.0+ ⭐</option>
              <option value="4.5">4.5+ ⭐</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t('pharm.statusLabel')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sort-select"
              disabled={isLoading}
            >
              <option value="all">{t('pharm.allPharmacies')}</option>
              <option value="open">{t('pharm.openNow')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t('pharm.sortName')}</label>
            <select
              value={nameSort}
              onChange={(e) => setNameSort(e.target.value)}
              className="sort-select"
              disabled={isLoading}
            >
              <option value="none">{t('pharm.noSort')}</option>
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
                  disabled={isLoading}
                />
                {t('pharm.sortDistance')}
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
              <div className="pharma-header">
                <h3>{pharma.name}</h3>
                {pharma.rating && <span className="rating-tag">⭐ {pharma.rating.toFixed(1)}</span>}
              </div>
              <p>{pharma.address}</p>
              <span className="phone">{pharma.phone}</span>
              {pharma.isOpen !== undefined && (
                <span className={`status ${pharma.isOpen ? 'open' : 'closed'}`}>
                  {pharma.isOpen ? t('pharm.openDot') : t('pharm.closedDot')}
                </span>
              )}
              {distance && (
                <span className="distance">{t('pharm.distanceKm', { n: distance })}</span>
              )}
              <button 
                className="btn-directions" 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pharma.coords.lat},${pharma.coords.lng}`)}
              >
                {t('pharm.getDirections')}
              </button>
            </div>
          );
        })}
        {filteredPharmacies.length === 0 && !isLoading && (
          <div className="no-results">
            <p>{t('pharm.noFoundSelectCity')}</p>
          </div>
        )}
      </div>
      <BottomNav active="map" />
    </div>
  );
};

export default PharmaciesPage;