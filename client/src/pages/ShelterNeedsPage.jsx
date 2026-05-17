import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiPhone, FiSearch, FiFilter } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import '../styles/ShelterNeedsPage.css';
import { useI18n } from '../i18n/I18nContext';

const getNeedsApiBaseUrl = () => {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!rawBase) {
    return '/api/needs';
  }

  const normalized = rawBase.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${normalized}/api/needs`;
};

const API_BASE_URL = getNeedsApiBaseUrl();
const SHELTER_API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/shelter`;

const formatNeedDueDisplay = (ymd) => {
  if (!ymd) return '';
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return String(ymd);
  }
};

const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getNeedShelterInfo = (need) => {
  if (need?.shelter?.name || need?.shelter?.address) {
    return need.shelter;
  }

  const nameFromNeed =
    need?.shelterName ||
    need?.shelter_name ||
    need?.organizationName ||
    need?.organization_name;
  const addressFromNeed =
    need?.shelterAddress ||
    need?.shelter_address ||
    need?.address ||
    need?.location;

  if (!nameFromNeed && !addressFromNeed) return null;
  return {
    name: nameFromNeed || '',
    address: addressFromNeed || '',
  };
};

const ShelterNeedsPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [needs, setNeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  const loadNeeds = useCallback(async () => {
    const fetchShelterByUserId = async (userId) => {
      const parsedUserId = toPositiveInt(userId);
      if (!parsedUserId) return null;
      const response = await fetch(`${SHELTER_API_BASE_URL}/profile/${parsedUserId}`);
      if (!response.ok) return null;
      const profile = await response.json().catch(() => null);
      if (!profile) return null;
      return {
        id: profile.shelterId || null,
        name: profile.name || profile.shelterName || '',
        address: profile.address || '',
        phone: profile.phone || '',
      };
    };

    const enrichNeedsWithShelter = async (items) => {
      const cache = new Map();
      return Promise.all(
        items.map(async (need) => {
          if (need?.shelter?.name || need?.shelter?.address) return need;
          const ownerUserId = toPositiveInt(need?.userId ?? need?.user_id);
          if (!ownerUserId) return need;
          if (!cache.has(ownerUserId)) {
            cache.set(ownerUserId, fetchShelterByUserId(ownerUserId));
          }
          const shelter = await cache.get(ownerUserId);
          return shelter ? { ...need, shelter } : need;
        })
      );
    };

    try {
      setIsLoading(true);
      setLoadError('');

      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'Failed to load shelter needs');
      }

      const data = await response.json();
      const enrichedNeeds = await enrichNeedsWithShelter(Array.isArray(data) ? data : []);
      setNeeds(enrichedNeeds);
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
            aria-label={t('sNeeds.backAria')}
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="shelter-needs-title-wrap">
            <h1>{t('sNeeds.title')}</h1>
            <p>{t('sNeeds.subtitle')}</p>
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
              placeholder={t('sNeeds.phSearch')}
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
              <FiMapPin size={16} /> {t('sNeeds.locLabel')}
            </label>
            <select
              id="location-filter"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="filter-select"
            >
              <option value="">{t('sNeeds.allLoc')}</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="priority-filter">
              <FiFilter size={16} /> {t('sNeeds.priLabel')}
            </label>
            <select
              id="priority-filter"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="filter-select"
            >
              <option value="">{t('sNeeds.allPri')}</option>
              <option value="low">{t('needMgr.optLow')}</option>
              <option value="medium">{t('needMgr.optMed')}</option>
              <option value="high">{t('needMgr.optHigh')}</option>
            </select>
          </div>
        </section>

        {/* Results */}
        <section className="shelter-needs-results">
          {isLoading ? (
            <div className="shelter-needs-empty">
              <h3>{t('sNeeds.loading')}</h3>
            </div>
          ) : loadError ? (
            <div className="shelter-needs-empty">
              <h3>{t('sNeeds.errTitle')}</h3>
              <p>{loadError}</p>
              <button
                type="button"
                className="retry-btn"
                onClick={loadNeeds}
              >
                {t('sNeeds.tryAgain')}
              </button>
            </div>
          ) : filteredNeeds.length === 0 ? (
            <div className="shelter-needs-empty">
              <h3>{t('sNeeds.noneTitle')}</h3>
              <p>
                {needs.length === 0 ? t('sNeeds.noneAll') : t('sNeeds.noneFilter')}
              </p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <h2>
                  {filteredNeeds.length === 1
                    ? t('sNeeds.found', { n: filteredNeeds.length })
                    : t('sNeeds.foundPlural', { n: filteredNeeds.length })}
                </h2>
              </div>

              <div className="needs-grid">
                {filteredNeeds.map((need) => {
                  const shelterInfo = getNeedShelterInfo(need);
                  return (
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
                        <strong>{t('sNeeds.category')}:</strong> {need.category}
                      </p>
                    )}

                    {(need.dueDate || need.due_date) && (
                      <p className="need-due-line">
                        <strong>{t('sNeeds.neededBy')}:</strong>{' '}
                        {formatNeedDueDisplay(need.dueDate || need.due_date)}
                      </p>
                    )}

                    {shelterInfo && (
                      <div className="shelter-info">
                        <div className="shelter-name">
                          <strong>{t('sNeeds.shelter')}:</strong>{' '}
                          {shelterInfo.name || t('sNeeds.unknownShelter')}
                        </div>

                        {shelterInfo.address && (
                          <div className="shelter-location">
                            <FiMapPin size={14} />
                            <span>{shelterInfo.address}</span>
                          </div>
                        )}

                        {shelterInfo.phone && (
                          <div className="shelter-contact">
                            <FiPhone size={14} />
                            <a href={`tel:${shelterInfo.phone}`}>
                              {shelterInfo.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )})}
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
