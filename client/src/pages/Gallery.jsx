import Layout from '../components/Layout';
import { useEffect, useMemo, useState } from 'react';
import '../styles/Gallery.css';
import BottomNav from '../components/BottomNav';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const fromUserObject = Number(user.userId || user.id);
    if (Number.isFinite(fromUserObject) && fromUserObject > 0) {
      return fromUserObject;
    }
  } catch {
    // fallback below
  }

  const raw =
    localStorage.getItem('userId') ||
    localStorage.getItem('basicUserId') ||
    localStorage.getItem('currentUserId');
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isCatVisibleInGallery = (cat) => {
  const source = (cat.source || 'shelter').toLowerCase();
  const listingType = (cat.listingType || '').toLowerCase();
  const listingStatus = (cat.listingStatus || '').toLowerCase();

  if (['adopted', 'placed', 'hidden'].includes(listingStatus)) {
    return false;
  }

  if (source === 'shelter') {
    return true;
  }

  if (source === 'private' && (listingType === 'foster' || listingStatus === 'pending')) {
    return true;
  }

  return false;
};

const getGalleryBadgeLabel = (cat) => {
  const listingType = (cat.listingType || '').toLowerCase();
  const listingStatus = (cat.listingStatus || '').toLowerCase();

  if (listingType === 'foster' || listingStatus === 'pending') {
    return 'fostered';
  }

  return (cat.source || 'shelter').toLowerCase();
};

const getValidImageUrl = (cat) => {
  const url = (cat?.image_url || '').trim();
  if (!url || url === 'null' || url === 'undefined') return '';
  return url;
};

const getCatAgeLabel = (cat) => {
  if (Number.isFinite(cat?.age)) {
    const numericAge = Number(cat.age);
    if (numericAge < 1) {
      const months = Math.max(1, Math.round(numericAge * 12));
      return `${months} month${months === 1 ? '' : 's'}`;
    }
    return `${numericAge} year${numericAge === 1 ? '' : 's'}`;
  }

  if (!cat?.birthDate) return '';
  const birth = new Date(cat.birthDate);
  if (Number.isNaN(birth.getTime())) return '';

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  const dayDiff = now.getDate() - birth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }
  if (years < 0) return '';

  if (years === 0) {
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + monthDiff;
    if (dayDiff < 0) {
      months -= 1;
    }
    months = Math.max(1, months);
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  return `${years} year${years === 1 ? '' : 's'}`;
};

const Gallery = () => {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [fosterSubmitting, setFosterSubmitting] = useState(false);
  const [fosterMessage, setFosterMessage] = useState('');
  const [fosterError, setFosterError] = useState('');
  const [requestType, setRequestType] = useState('adoption');
  const [requestComment, setRequestComment] = useState('');
  const currentUserId = getCurrentUserId();
  const [filters, setFilters] = useState({
    source: 'all',
    sex: '',
    urgency: '',
    breed: '',
  });

  const fetchCats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/api/cats`);
      if (!response.ok) {
        throw new Error('Failed to load cats');
      }
      const data = await response.json();
      setCats(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  useEffect(() => {
    if (!selectedCat) {
      return undefined;
    }

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedCat(null);
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [selectedCat]);

  useEffect(() => {
    setFosterMessage('');
    setFosterError('');
    setRequestComment('');
    setRequestType(selectedCat?.listingType === 'foster' ? 'foster' : 'adoption');
  }, [selectedCat]);

  const filteredCats = useMemo(() => {
  return cats.filter((cat) => {
    const source = (cat.source || 'shelter').toLowerCase();
    const listingType = (cat.listingType || '').toLowerCase();
    const listingStatus = (cat.listingStatus || '').toLowerCase();

    const visibleInGallery = isCatVisibleInGallery(cat);

    const sourceMatch =
      filters.source === 'all'
        ? true
        : filters.source === 'private'
          ? source === 'private' && (listingType === 'foster' || listingStatus === 'pending')
          : source === filters.source;

    const sexMatch = !filters.sex || (cat.sex || '') === filters.sex;
    const urgencyMatch = !filters.urgency || (cat.urgency || '') === filters.urgency;
    const breedMatch =
      !filters.breed || (cat.breed || '').toLowerCase().includes(filters.breed.toLowerCase());

    return visibleInGallery && sourceMatch && sexMatch && urgencyMatch && breedMatch;
  });
}, [cats, filters]);

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFosterRequest = async () => {
    if (!selectedCat?.id || fosterSubmitting) {
      return;
    }
    if (!currentUserId) {
      setFosterError('Please log in first.');
      return;
    }

    try {
      setFosterSubmitting(true);
      setFosterError('');
      setFosterMessage('');

      const requestBody = JSON.stringify({
        userId: currentUserId,
        type: requestType,
        comment: requestComment.trim(),
      });

      let response = await fetch(`${API_BASE_URL}/api/cats/${selectedCat.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      // Backward compatibility: if server still uses old endpoint.
      if (response.status === 404) {
        response = await fetch(`${API_BASE_URL}/api/cats/${selectedCat.id}/foster-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to send request');
      }

      setFosterMessage(payload.message || 'Your request has been sent successfully.');
    } catch (requestError) {
      setFosterError(requestError.message);
    } finally {
      setFosterSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="gallery-page">
        <div className="gallery-intro">
          <h2 className="gallery-title">Browse cats</h2>
        </div>
        <div className="gallery-body">
          <aside className="filters-panel" aria-label="Search filters">
            <h3 className="filters-panel-title">Search Filters</h3>

            <div className="filter-group">
              <label htmlFor="filter-source">Category</label>
              <select
                id="filter-source"
                value={filters.source}
                onChange={(event) => onFilterChange('source', event.target.value)}
              >
                <option value="all">All Cats</option>
                <option value="shelter">Shelter Only</option>
                <option value="private">Private / Foster</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-sex">Sex</label>
              <select
                id="filter-sex"
                value={filters.sex}
                onChange={(event) => onFilterChange('sex', event.target.value)}
              >
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-urgency">Urgency Level</label>
              <select
                id="filter-urgency"
                value={filters.urgency}
                onChange={(event) => onFilterChange('urgency', event.target.value)}
              >
                <option value="">Any</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="immediate">Immediate</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-breed">Breed</label>
              <input
                id="filter-breed"
                type="text"
                placeholder="e.g. Maine Coon"
                value={filters.breed}
                onChange={(event) => onFilterChange('breed', event.target.value)}
              />
            </div>
          </aside>

          <main className="gallery-main" aria-label="Cat listings">
            {loading && <p className="status-message">Loading cats...</p>}
            {error && <p className="form-error">{error}</p>}
            {!loading && !error && (
              <div className="cat-grid">
                {filteredCats.map((cat) => (
                  <div
                    className="cat-card"
                    key={cat.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCat(cat)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedCat(cat);
                      }
                    }}
                  >
                    <div className="image-wrapper">
                      {getValidImageUrl(cat) ? (
                        <img src={getValidImageUrl(cat)} alt={cat.name} />
                      ) : (
                        <div className="cat-modal-image" style={{ display: 'grid', placeItems: 'center', color: '#9aa3b2' }}>
                          No photo
                        </div>
                      )}
                      <span className={`badge ${getGalleryBadgeLabel(cat)}`}>
                       {getGalleryBadgeLabel(cat)}
                      </span>
                    </div>

                    <div className="cat-info">
                      <div className="card-header">
                        <h3>{cat.name}</h3>
                        {cat.personality && <span className="ai-tag">✨ {cat.personality}</span>}
                      </div>

                      <p className="specs">
                        {cat.breed || 'Unknown breed'}
                        {getCatAgeLabel(cat) ? ` • ${getCatAgeLabel(cat)}` : ''}
                      </p>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      {selectedCat && (
        <div
          className="cat-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedCat(null)}
        >
          <article
            className="cat-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedCat.name} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="cat-modal-close"
              onClick={() => setSelectedCat(null)}
              aria-label="Close modal"
            >
              x
            </button>

            {getValidImageUrl(selectedCat) ? (
              <img
                className="cat-modal-image"
                src={getValidImageUrl(selectedCat)}
                alt={selectedCat.name}
              />
            ) : (
              <div className="cat-modal-image" style={{ display: 'grid', placeItems: 'center', color: '#9aa3b2' }}>
                No photo
              </div>
            )}

            <div className="cat-modal-content">
              <h3>{selectedCat.name}</h3>
              <p className="cat-modal-meta">
                {selectedCat.breed || 'Unknown breed'}
                {getCatAgeLabel(selectedCat) ? ` • ${getCatAgeLabel(selectedCat)}` : ''}
              </p>
              <p className="cat-modal-description">
                {selectedCat.description || 'No description added yet.'}
              </p>
              <div className="cat-modal-chips">
                {selectedCat.source && (
                  <span className="cat-chip">Status: {getGalleryBadgeLabel(selectedCat)}</span>
                )}
                {selectedCat.sex && <span className="cat-chip">Sex: {selectedCat.sex}</span>}
                {selectedCat.urgency && (
                  <span className="cat-chip">Urgency: {selectedCat.urgency}</span>
                )}
                {selectedCat.personality && (
                  <span className="cat-chip">Personality: {selectedCat.personality}</span>
                )}
              </div>
              <div className="cat-modal-actions">
                <div className="request-form-panel">
                  <div className="request-form-grid">
                    <div className="request-form-field request-type-field">
                      <label htmlFor="request-type">Request type</label>
                      <select
                        id="request-type"
                        value={requestType}
                        onChange={(event) => setRequestType(event.target.value)}
                      >
                        <option value="adoption">Adoption</option>
                        <option value="foster">Foster Care</option>
                      </select>
                    </div>
                    <div className="request-form-field request-comment-field">
                      <label htmlFor="request-comment">Message</label>
                      <textarea
                        id="request-comment"
                        rows={3}
                        placeholder="Add a message for the shelter (optional)"
                        value={requestComment}
                        onChange={(event) => setRequestComment(event.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-foster-request"
                    onClick={handleFosterRequest}
                    disabled={fosterSubmitting}
                  >
                    {fosterSubmitting ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
                {fosterMessage && <p className="foster-success">{fosterMessage}</p>}
                {fosterError && <p className="form-error">{fosterError}</p>}
              </div>
            </div>
          </article>
        </div>
      )}
      <BottomNav active="gallery" />
    </Layout>
  );
};
export default Gallery;