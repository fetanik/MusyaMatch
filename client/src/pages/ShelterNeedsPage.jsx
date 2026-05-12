import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiPhone, FiSearch, FiFilter } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import '../styles/ShelterNeedsPage.css';

const getNeedsApiBaseUrl = () => {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!rawBase) {
    return '/api/needs';
  }

  const normalized = rawBase.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${normalized}/api/needs`;
};

const API_BASE_URL = getNeedsApiBaseUrl();

const ShelterNeedsPage = () => {
  const navigate = useNavigate();
  const [needs, setNeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  const loadNeeds = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError('');

      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'Failed to load shelter needs');
      }

      const data = await response.json();
      setNeeds(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load needs:', error);
      setLoadError('Could not load needs. Please try again.');
      setNeeds([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNeeds();
  }, [loadNeeds]);

  // Get unique locations from shelter data
  const locations = useMemo(() => {
    const locs = new Set();
    needs.forEach((need) => {
      if (need.shelter?.address) {
        locs.add(need.shelter.address);
      }
    });
    return Array.from(locs).sort();
  }, [needs]);

  
  const filteredNeeds = useMemo(() => {
    return needs.filter((need) => {
      const matchesSearch =
        searchText === '' ||
        need.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (need.description && need.description.toLowerCase().includes(searchText.toLowerCase())) ||
        (need.shelter?.name && need.shelter.name.toLowerCase().includes(searchText.toLowerCase()));

      const matchesLocation =
        selectedLocation === '' || need.shelter?.address === selectedLocation;

      const matchesPriority =
        selectedPriority === '' || need.priority === selectedPriority;

      const isOpen = need.status === 'open';

      return matchesSearch && matchesLocation && matchesPriority && isOpen;
    });
  }, [needs, searchText, selectedLocation, selectedPriority]);

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
    };
    return colors[priority] || '#6b7280';
  };

  return (
    <div className="shelter-needs-page">
      <header className="shelter-needs-hero">
        <div className="shelter-needs-header-row">
          <button
            type="button"
            className="shelter-needs-back-btn"
            onClick={() => navigate('/')}
            aria-label="Back to home"
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="shelter-needs-title-wrap">
            <h1>Shelter Needs</h1>
            <p>Help shelters in need</p>
          </div>
        </div>
      </header>

      <main className="shelter-needs-content">
        {/* Search Bar */}
        <section className="shelter-needs-search">
          <div className="search-input-wrapper">
            <FiSearch size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search needs, shelters..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
            />
          </div>
        </section>

        {/* Filters */}
        <section className="shelter-needs-filters">
          <div className="filter-item">
            <label htmlFor="location-filter">
              <FiMapPin size={16} /> Location
            </label>
            <select
              id="location-filter"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="filter-select"
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="priority-filter">
              <FiFilter size={16} /> Priority
            </label>
            <select
              id="priority-filter"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="filter-select"
            >
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </section>

        {/* Results */}
        <section className="shelter-needs-results">
          {isLoading ? (
            <div className="shelter-needs-empty">
              <h3>Loading needs...</h3>
            </div>
          ) : loadError ? (
            <div className="shelter-needs-empty">
              <h3>Error loading needs</h3>
              <p>{loadError}</p>
              <button
                type="button"
                className="retry-btn"
                onClick={loadNeeds}
              >
                Try Again
              </button>
            </div>
          ) : filteredNeeds.length === 0 ? (
            <div className="shelter-needs-empty">
              <h3>No needs found</h3>
              <p>
                {needs.length === 0
                  ? 'There are no active shelter needs at the moment.'
                  : 'No needs match your filters. Try adjusting your search.'}
              </p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <h2>Found {filteredNeeds.length} need{filteredNeeds.length !== 1 ? 's' : ''}</h2>
              </div>

              <div className="needs-grid">
                {filteredNeeds.map((need) => (
                  <div key={need.id} className="need-card-item">
                    <div className="need-card-header">
                      <h3>{need.title}</h3>
                      <span
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(need.priority) }}
                      >
                        {need.priority}
                      </span>
                    </div>

                    {need.description && (
                      <p className="need-description">{need.description}</p>
                    )}

                    {need.category && (
                      <p className="need-category">
                        <strong>Category:</strong> {need.category}
                      </p>
                    )}

                    {need.shelter && (
                      <div className="shelter-info">
                        <div className="shelter-name">
                          <strong>Shelter:</strong> {need.shelter.name || 'Unknown Shelter'}
                        </div>

                        {need.shelter.address && (
                          <div className="shelter-location">
                            <FiMapPin size={14} />
                            <span>{need.shelter.address}</span>
                          </div>
                        )}

                        {need.shelter.phone && (
                          <div className="shelter-contact">
                            <FiPhone size={14} />
                            <a href={`tel:${need.shelter.phone}`}>
                              {need.shelter.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <BottomNav active="home" />
    </div>
  );
};

export default ShelterNeedsPage;
