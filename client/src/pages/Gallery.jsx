import Layout from '../components/Layout';
import { useEffect, useMemo, useState } from 'react';
import '../styles/Gallery.css';
import BottomNav from '../components/BottomNav';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Gallery = () => {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [fosterSubmitting, setFosterSubmitting] = useState(false);
  const [fosterMessage, setFosterMessage] = useState('');
  const [fosterError, setFosterError] = useState('');
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
  }, [selectedCat]);

  const filteredCats = useMemo(() => {
    return cats.filter((cat) => {
      const sourceMatch = filters.source === 'all' || (cat.source || 'shelter') === filters.source;
      const sexMatch = !filters.sex || (cat.sex || '') === filters.sex;
      const urgencyMatch = !filters.urgency || (cat.urgency || '') === filters.urgency;
      const breedMatch =
        !filters.breed || (cat.breed || '').toLowerCase().includes(filters.breed.toLowerCase());

      return sourceMatch && sexMatch && urgencyMatch && breedMatch;
    });
  }, [cats, filters]);

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFosterRequest = async () => {
    if (!selectedCat?.id || fosterSubmitting) {
      return;
    }

    try {
      setFosterSubmitting(true);
      setFosterError('');
      setFosterMessage('');

      const response = await fetch(`${API_BASE_URL}/api/cats/${selectedCat.id}/foster-request`, {
        method: 'POST',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to send foster request');
      }

      setFosterMessage(payload.message || 'Request sent');
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
                      <img src={cat.image_url} alt={cat.name} />
                      <span className={`badge ${(cat.source || 'shelter').toLowerCase()}`}>
                        {cat.source || 'shelter'}
                      </span>
                    </div>

                    <div className="cat-info">
                      <div className="card-header">
                        <h3>{cat.name}</h3>
                        {cat.personality && <span className="ai-tag">✨ {cat.personality}</span>}
                      </div>

                      <p className="specs">{cat.breed || 'Unknown breed'} {Number.isFinite(cat.age) ? `• ${cat.age} years` : ''}</p>

                      {cat.source === 'private' && cat.urgency && (
                        <div className={`urgency-banner ${cat.urgency.toLowerCase()}`}>
                          Urgency: {cat.urgency}
                        </div>
                      )}
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

            <img
              className="cat-modal-image"
              src={selectedCat.image_url}
              alt={selectedCat.name}
            />

            <div className="cat-modal-content">
              <h3>{selectedCat.name}</h3>
              <p className="cat-modal-meta">
                {selectedCat.breed || 'Unknown breed'}
                {Number.isFinite(selectedCat.age) ? ` • ${selectedCat.age} years` : ''}
              </p>
              <p className="cat-modal-description">
                {selectedCat.description || 'No description added yet.'}
              </p>
              <div className="cat-modal-chips">
                {selectedCat.source && (
                  <span className="cat-chip">Source: {selectedCat.source}</span>
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
                <button
                  type="button"
                  className="btn-foster-request"
                  onClick={handleFosterRequest}
                  disabled={fosterSubmitting}
                >
                  {fosterSubmitting ? 'Sending...' : 'Request Foster Care'}
                </button>
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