import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ManagerProfile.css';

import {
  FiFileText,
  FiBell,
  FiPlusCircle,
  FiMapPin,
  FiCalendar,
  FiClipboard,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { FaPaw } from 'react-icons/fa6';
import BottomNav from '../components/BottomNav';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/cats`;

const normalizeVaccinations = (vaccinations) => {
  if (!Array.isArray(vaccinations)) return [];

  return vaccinations
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const formatGender = (gender) => {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  return 'Not specified';
};

const ManagerProfile = () => {
  const navigate = useNavigate();

  const topRef = useRef(null);

  const [shelterName, setShelterName] = useState('Happy Paws Shelter');
  const [shelterLogo, setShelterLogo] = useState('');
  const [myCats, setMyCats] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [expandedCatId, setExpandedCatId] = useState(null);
  const [vaccinationInput, setVaccinationInput] = useState('');
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  const [newCatData, setNewCatData] = useState({
    name: '',
    breed: '',
    gender: '',
    birthDate: '',
    description: '',
    vaccinations: [],
  });

  const [requests, setRequests] = useState([
    {
      id: 1,
      type: 'Adoption',
      catName: 'Luna',
      applicant: 'Maria S.',
      status: 'pending',
      time: '2 hrs ago',
    },
    {
      id: 2,
      type: 'Adoption',
      catName: 'Milo',
      applicant: 'Andrii K.',
      status: 'pending',
      time: '5 hrs ago',
    },
    {
      id: 3,
      type: 'Adoption',
      catName: 'Nala',
      applicant: 'Oksana P.',
      status: 'approved',
      time: '1 day ago',
    },
  ]);

  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setShelterName(parsed.shelterName || parsed.name || 'Happy Paws Shelter');
        setShelterLogo(parsed.logo || '');
      } catch {
        setShelterName('Happy Paws Shelter');
        setShelterLogo('');
      }
    }

    const loadCats = async () => {
      try {
        setIsLoadingCats(true);

        const response = await fetch(API_BASE_URL);

        if (!response.ok) {
          throw new Error('Failed to load cats');
        }

        const data = await response.json();
        const apiCats = Array.isArray(data)
          ? data.map((cat) => ({
              ...cat,
              vaccinations: normalizeVaccinations(cat.vaccinations),
            }))
          : [];

        setMyCats(apiCats);
      } catch (error) {
        console.error('Failed to load cats from API:', error);
        setMyCats([]);
      } finally {
        setIsLoadingCats(false);
      }
    };

    loadCats();
  }, []);

  const stats = useMemo(() => {
    return {
      available: myCats.filter((cat) => cat.listingStatus === 'active').length,
      adopted: myCats.filter((cat) => cat.listingStatus === 'adopted').length,
      total: myCats.length,
    };
  }, [myCats]);

  const pendingRequests = requests.filter((request) => request.status === 'pending');

  const handleRequestAction = (requestId, newStatus) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: newStatus } : request
      )
    );
  };

  const resetCatForm = () => {
    setNewCatData({
      name: '',
      breed: '',
      gender: '',
      birthDate: '',
      description: '',
      vaccinations: [],
    });
    setVaccinationInput('');
    setEditingCatId(null);
  };

  const openAddCatModal = () => {
    resetCatForm();
    setIsModalOpen(true);
  };

  const openEditCatModal = (cat) => {
    setEditingCatId(cat.id);
    setNewCatData({
      name: cat.name || '',
      breed: cat.breed || '',
      gender: cat.gender || '',
      birthDate: cat.birthDate || '',
      description: cat.description || '',
      vaccinations: normalizeVaccinations(cat.vaccinations),
    });
    setVaccinationInput('');
    setIsModalOpen(true);
  };

  const openVaccinationPage = (cat) => {
    navigate(`/manager/cats/${cat.id}/vaccinations`, {
      state: { cat },
    });
  };

  const closeCatModal = () => {
    resetCatForm();
    setIsModalOpen(false);
  };

  const handleAddVaccination = () => {
    const value = vaccinationInput.trim();
    if (!value) return;

    setNewCatData((prev) => {
      const exists = prev.vaccinations.some(
        (item) => item.toLowerCase() === value.toLowerCase()
      );

      if (exists) return prev;

      return {
        ...prev,
        vaccinations: [...prev.vaccinations, value],
      };
    });

    setVaccinationInput('');
  };

  const handleRemoveVaccination = (indexToRemove) => {
    setNewCatData((prev) => ({
      ...prev,
      vaccinations: prev.vaccinations.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();

    const existingCat = myCats.find((cat) => cat.id === editingCatId);

    const payload = {
      name: newCatData.name.trim(),
      breed: newCatData.breed.trim(),
      gender: newCatData.gender || null,
      birthDate: newCatData.birthDate || null,
      description: newCatData.description.trim(),
      vaccinations: normalizeVaccinations(newCatData.vaccinations),
      sourceType: existingCat?.sourceType || 'shelter',
      listingType: existingCat?.listingType || 'adoption',
      listingStatus: existingCat?.listingStatus || 'active',
      shelterId: existingCat?.shelterId ?? null,
      userId: existingCat?.userId ?? null,
    };

    try {
      if (editingCatId) {
        const response = await fetch(`${API_BASE_URL}/${editingCatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update cat');
        }

        const updatedCat = await response.json();

        setMyCats((prev) =>
          prev.map((cat) =>
            cat.id === editingCatId
              ? {
                  ...updatedCat,
                  vaccinations: normalizeVaccinations(updatedCat.vaccinations),
                }
              : cat
          )
        );
      } else {
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to create cat');
        }

        const savedCat = await response.json();

        setMyCats((prev) => [
          {
            ...savedCat,
            vaccinations: normalizeVaccinations(savedCat.vaccinations),
          },
          ...prev,
        ]);
      }

      closeCatModal();
    } catch (error) {
      console.error('Failed to save cat:', error);
      alert('Failed to save cat profile. Please check the backend connection.');
    }
  };

  const handleDeleteCat = async (catId) => {
    const confirmed = window.confirm('Are you sure you want to delete this cat profile?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${catId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete cat');
      }

      setMyCats((prev) => prev.filter((cat) => cat.id !== catId));

      if (expandedCatId === catId) {
        setExpandedCatId(null);
      }

      if (editingCatId === catId) {
        closeCatModal();
      }
    } catch (error) {
      console.error('Failed to delete cat:', error);
      alert('Failed to delete cat profile. Please check the backend connection.');
    }
  };

  const formatAge = (birthDate) => {
    if (!birthDate) return 'Not specified';

    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return 'Not specified';

    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const yearLabel = years === 1 ? 'year' : 'years';
    const monthLabel = months === 1 ? 'month' : 'months';

    if (years <= 0) {
      return `${months} ${monthLabel}`;
    }

    return months > 0
      ? `${years} ${yearLabel} ${months} ${monthLabel}`
      : `${years} ${yearLabel}`;
  };

  const showPlaceholder = (label) => {
    alert(`${label} will be added later`);
  };

  return (
    <div className="manager-dashboard" ref={topRef}>
      <header className="manager-hero">
        <div className="manager-header">
          <div className="brand-block">
            <div className="brand-icon">
              {shelterLogo ? (
                <img
                  src={shelterLogo}
                  alt="Shelter logo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '18px',
                  }}
                />
              ) : (
                <FaPaw size={22} />
              )}
            </div>

            <div className="brand-text">
              <h1>Hello, {shelterName}</h1>
              <p>Shelter dashboard</p>
            </div>
          </div>

          <button
            className="hero-icon-btn"
            type="button"
            onClick={() => navigate('/manager/settings')}
            title="Open profile settings"
          >
            <FiBell size={20} />
          </button>
        </div>

        <div className="stats-card">
          <div className="section-chip">Shelter statistics</div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.available}</span>
              <span className="stat-label">Available</span>
            </div>

            <div className="stat-card">
              <span className="stat-number">{stats.adopted}</span>
              <span className="stat-label">Adopted</span>
            </div>

            <div className="stat-card">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total Cats</span>
            </div>
          </div>
        </div>
      </header>

      <main className="manager-content">
        <section className="manager-section">
          <div className="section-head">
            <div>
              <h2>Active requests</h2>
              <p>Review pending adoption applications</p>
            </div>
            <span className="section-count">{pendingRequests.length}</span>
          </div>

          <div className="requests-list">
            {pendingRequests.length === 0 ? (
              <div className="empty-card">
                <p>No pending requests right now.</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-main">
                    <div className="request-icon">
                      <FiFileText size={18} />
                    </div>

                    <div className="request-info">
                      <h3>
                        {request.type}: {request.catName}
                      </h3>
                      <p>
                        Applicant: {request.applicant} • {request.time}
                      </p>
                    </div>
                  </div>

                  <div className="request-actions">
                    <button
                      className="approve-btn"
                      type="button"
                      onClick={() => handleRequestAction(request.id, 'approved')}
                    >
                      <FiCheck size={16} />
                      Approve
                    </button>

                    <button
                      className="reject-btn"
                      type="button"
                      onClick={() => handleRequestAction(request.id, 'rejected')}
                    >
                      <FiX size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="manager-section">
          <div className="section-head">
            <div>
              <h2>Management actions</h2>
              <p>Main tools for shelter workflow</p>
            </div>
          </div>

          <div className="action-grid">
            <button
              className="action-card"
              type="button"
              onClick={openAddCatModal}
            >
              <div className="action-icon">
                <FiPlusCircle size={22} />
              </div>
              <h3>Add Cat</h3>
              <p>Create a new cat profile</p>
            </button>

            <button
              className="action-card"
              type="button"
              onClick={() => navigate('/pharmacies')}
            >
              <div className="action-icon">
                <FiMapPin size={22} />
              </div>
              <h3>Vet-pharmacies</h3>
              <p>Open pharmacy map</p>
            </button>

            <button
              className="action-card"
              type="button"
              onClick={() => showPlaceholder('Events')}
            >
              <div className="action-icon">
                <FiCalendar size={22} />
              </div>
              <h3>Add Events</h3>
              <p>Planned shelter activities</p>
            </button>

            <button
              className="action-card"
              type="button"
              onClick={() => showPlaceholder('Shelter needs')}
            >
              <div className="action-icon">
                <FiClipboard size={22} />
              </div>
              <h3>Needs</h3>
              <p>Temporary placeholder</p>
            </button>
          </div>
        </section>

        <section className="manager-section">
          <div className="section-head">
            <div>
              <h2>My cats</h2>
              <p>Tap a cat card to edit, delete, or open vaccinations</p>
            </div>
            <span className="section-count">{myCats.length}</span>
          </div>

          {isLoadingCats ? (
            <div className="empty-card">
              <p>Loading cats...</p>
            </div>
          ) : myCats.length === 0 ? (
            <div className="empty-card">
              <p>No cats yet. Add the first cat profile.</p>
            </div>
          ) : (
            <div className="cats-grid">
              {myCats.map((cat) => {
                const isExpanded = expandedCatId === cat.id;
                const vaccinations = normalizeVaccinations(cat.vaccinations);

                return (
                  <article
                    key={cat.id}
                    className={`cat-card clickable-cat-card ${isExpanded ? 'expanded-cat-card' : ''}`}
                    onClick={() =>
                      setExpandedCatId((prev) => (prev === cat.id ? null : cat.id))
                    }
                  >
                    <div className="cat-card-head">
                      <div>
                        <h3>{cat.name || 'Unnamed cat'}</h3>
                        <p>{cat.breed || 'Breed not specified'}</p>
                      </div>

                      <span className={`status-badge ${cat.listingStatus || 'active'}`}>
                        {cat.listingStatus || 'active'}
                      </span>
                    </div>

                    <div className="cat-meta">
                      <span>
                        <strong>Gender:</strong> {formatGender(cat.gender)}
                      </span>
                      <span>
                        <strong>Age:</strong> {formatAge(cat.birthDate)}
                      </span>
                      <span>
                        <strong>Vaccinations:</strong>{' '}
                        {vaccinations.length > 0 ? vaccinations.length : 'Not added'}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="cat-expanded-content">
                        <p className="cat-description">
                          {cat.description || 'No description yet.'}
                        </p>

                        <div className="cat-vaccination-block">
                          <p className="cat-vaccination-title">Vaccinations</p>

                          {vaccinations.length > 0 ? (
                            <div className="cat-vaccination-list">
                              {vaccinations.map((item, index) => (
                                <span key={`${item}-${index}`} className="cat-vaccination-chip">
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="no-vaccinations-text">
                              No vaccinations added yet.
                            </p>
                          )}
                        </div>

                        <div className="cat-card-actions">
                          <button
                            type="button"
                            className="cat-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openVaccinationPage(cat);
                            }}
                          >
                            Vaccinations
                          </button>

                          <button
                            type="button"
                            className="cat-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCatModal(cat);
                            }}
                          >
                            Edit profile
                          </button>

                          <button
                            type="button"
                            className="cat-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCat(cat.id);
                            }}
                          >
                            Delete profile
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingCatId ? 'Edit Cat Profile' : 'Add New Cat'}</h3>
              <button
                className="modal-close"
                type="button"
                onClick={closeCatModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCat} className="cat-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newCatData.name}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Cat name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Breed</label>
                <input
                  type="text"
                  value={newCatData.breed}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, breed: e.target.value }))
                  }
                  placeholder="Breed"
                  required
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  value={newCatData.gender}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="form-group">
                <label>Birth date</label>
                <input
                  type="date"
                  value={newCatData.birthDate}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, birthDate: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Add vaccinations</label>

                <div className="vaccination-builder">
                  <div className="vaccination-input-row">
                    <input
                      type="text"
                      value={vaccinationInput}
                      onChange={(e) => setVaccinationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddVaccination();
                        }
                      }}
                      placeholder="Add vaccination"
                    />

                    <button
                      type="button"
                      className="vaccination-add-btn"
                      onClick={handleAddVaccination}
                    >
                      + Add vaccine
                    </button>
                  </div>

                  {newCatData.vaccinations.length > 0 && (
                    <div className="vaccination-tags">
                      {newCatData.vaccinations.map((item, index) => (
                        <div key={`${item}-${index}`} className="vaccination-tag">
                          <span>{item}</span>
                          <button
                            type="button"
                            className="vaccination-tag-remove"
                            onClick={() => handleRemoveVaccination(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newCatData.description}
                  onChange={(e) =>
                    setNewCatData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Detailed cat description"
                  rows="4"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeCatModal}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingCatId ? 'Save changes' : 'Save Cat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  );
};

export default ManagerProfile;