import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../styles/DashboardPage.css';

import {
  Bell,
  Award,
  Star,
  Heart,
  Cpu,
  MessageSquare,
  Users,
  MapPin,
  TrendingUp,
  Cat,
  PlusCircle,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';

const CATS_API = `${import.meta.env.VITE_API_BASE_URL || ''}/api/cats`;

const emptyForm = {
  name: '',
  breed: '',
  age: '',
  gender: '',
  description: '',
  vaccinationsText: '',
};

const normalizeVaccinations = (vaccinations) => {
  if (Array.isArray(vaccinations)) {
    return vaccinations
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof vaccinations === 'string') {
    const trimmed = vaccinations.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
      }
    } catch {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const vaccinationsToText = (vaccinations) =>
  normalizeVaccinations(vaccinations).join(', ');

const parseVaccinationsText = (text) =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getCurrentUserId = () => {
  const raw =
    localStorage.getItem('userId') ||
    localStorage.getItem('basicUserId') ||
    localStorage.getItem('currentUserId');

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getStatusMeta = (cat) => {
  if (cat.listingType === 'foster' || cat.listingStatus === 'pending') {
    return { label: 'Fostered', className: 'fostered' };
  }

  if (cat.listingStatus === 'placed' || cat.listingStatus === 'adopted') {
    return { label: 'Placed', className: 'adopted' };
  }

  return { label: 'Private', className: 'available' };
};

const DashboardPage = () => {
  const userId = getCurrentUserId();
  const userName = localStorage.getItem('userName') || 'Alex Johnson';

  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [fosterLoadingId, setFosterLoadingId] = useState(null);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [selectedVaccinationCat, setSelectedVaccinationCat] = useState(null);

  const fetchMyCats = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');

      const response = await fetch(CATS_API);
      if (!response.ok) {
        throw new Error('Failed to load cats');
      }

      const data = await response.json();
      const allCats = Array.isArray(data) ? data : [];

      const myCats = allCats.filter((cat) => Number(cat.userId) === userId);
      setCats(myCats);
    } catch (error) {
      console.error(error);
      setPageError(error.message || 'Failed to load cats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setPageError('User ID was not found. Please log in or save your profile first.');
      return;
    }

    fetchMyCats();
  }, [fetchMyCats, userId]);

  const fosterCount = useMemo(
    () =>
      cats.filter(
        (cat) => cat.listingType === 'foster' || cat.listingStatus === 'pending'
      ).length,
    [cats]
  );

  const openAddCatModal = () => {
    setEditingCat(null);
    setForm(emptyForm);
    setIsCatModalOpen(true);
  };

  const openEditCatModal = (cat) => {
    setEditingCat(cat);
    setForm({
      name: cat.name || '',
      breed: cat.breed || '',
      age: cat.age ?? '',
      gender: cat.gender || '',
      description: cat.description || '',
      vaccinationsText: vaccinationsToText(cat.vaccinations),
    });
    setIsCatModalOpen(true);
  };

  const closeCatModal = () => {
    setIsCatModalOpen(false);
    setEditingCat(null);
    setForm(emptyForm);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();

    if (!userId) {
      alert('User ID is missing. Please log in first.');
      return;
    }

    if (!form.name.trim()) {
      alert('Cat name is required.');
      return;
    }

    const payload = {
      userId,
      shelterId: null,
      name: form.name.trim(),
      breed: form.breed.trim() || null,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      description: form.description.trim() || null,
      vaccinations: parseVaccinationsText(form.vaccinationsText),
      source: 'private',
      sourceType: 'private',
      listingType: editingCat?.listingType || 'none',
      listingStatus: editingCat?.listingStatus || 'active',
    };

    try {
      setSaveLoading(true);

      const response = await fetch(
        editingCat ? `${CATS_API}/${editingCat.id}` : CATS_API,
        {
          method: editingCat ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to save cat');
      }

      closeCatModal();
      await fetchMyCats();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to save cat.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteCat = async (cat) => {
    const confirmed = window.confirm(`Delete ${cat.name}?`);
    if (!confirmed) return;

    try {
      setDeleteLoadingId(cat.id);

      const response = await fetch(`${CATS_API}/${cat.id}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to delete cat');
      }

      await fetchMyCats();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to delete cat.');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleFosterCat = async (cat) => {
    try {
      setFosterLoadingId(cat.id);

      const fosterResponse = await fetch(`${CATS_API}/${cat.id}/foster-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      });

      const fosterData = await fosterResponse.json().catch(() => ({}));

      if (!fosterResponse.ok) {
        throw new Error(fosterData?.message || 'Failed to send foster request');
      }

      const updateResponse = await fetch(`${CATS_API}/${cat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingType: 'foster',
          listingStatus: 'pending',
          sourceType: cat.sourceType || 'private',
          source: cat.source || 'private',
        }),
      });

      const updateData = await updateResponse.json().catch(() => ({}));

      if (!updateResponse.ok) {
        throw new Error(updateData?.message || 'Failed to update foster status');
      }

      await fetchMyCats();
      alert(`${cat.name} was successfully marked for foster.`);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to put the cat on foster.');
    } finally {
      setFosterLoadingId(null);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header-bg">
        <header className="profile-header">
          <div className="user-info">
            <div className="avatar">
              <Cat color="#FFB347" size={24} />
            </div>
            <div className="text-info">
              <h1>Hello, {userName}!</h1>
              <p>Level 1 Cat Parent</p>
            </div>
          </div>
          <button className="notification-btn" type="button">
            <Bell />
          </button>
        </header>

        <div className="purr-points-card">
          <div className="points-header">
            <p className="points-label">Your Purr-Points</p>
            <div className="points-icon-badge">
              <Award color="white" />
            </div>
          </div>

          <div className="points-value">
            <h2>0</h2>
            <span>pts</span>
          </div>

          <div className="level-info">
            <span className="current-level">Level 1</span>
            <span className="points-to-next">250 pts to Level 2</span>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: '0%' }} />
          </div>

          <div className="achievements-row">
            <div className="achievement-badge">
              <Star /> 0 Achievements
            </div>
            <div className="achievement-badge foster-badge">
              <Heart fill="currentColor" /> {fosterCount} Fosters
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="ai-banner">
          <div className="ai-icon-wrapper">
            <Cpu />
          </div>
          <div className="ai-text">
            <h3>Chat with Musya AI</h3>
            <p>Get expert advice & find your perfect match</p>
          </div>
          <button className="ai-action-btn" type="button">
            <MessageSquare />
          </button>
        </div>

        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>

        <div className="quick-actions-grid">
          <div className="action-card" onClick={openAddCatModal}>
            <div className="action-icon"><PlusCircle /></div>
            <h4>Add a Cat</h4>
            <p>Create your cat profile</p>
          </div>

          <div className="action-card">
            <div className="action-icon"><Users /></div>
            <h4>Community</h4>
            <p>Connect with others</p>
          </div>

          <div className="action-card">
            <div className="action-icon"><MapPin /></div>
            <h4>Find Vet</h4>
            <p>Nearby clinics</p>
          </div>

          <div className="action-card">
            <div className="action-icon"><TrendingUp /></div>
            <h4>My Progress</h4>
            <p>View achievements</p>
          </div>
        </div>

        <div className="my-cats-header">
          <div>
            <h2>My Cats</h2>
            <p>Manage your cat profiles, vaccinations, and foster status</p>
          </div>

          <button type="button" className="add-cat-btn" onClick={openAddCatModal}>
            <PlusCircle size={18} />
            <span>Add Cat</span>
          </button>
        </div>

        {loading ? (
          <div className="empty-card">
            <p>Loading cats...</p>
          </div>
        ) : pageError ? (
          <div className="empty-card">
            <p>{pageError}</p>
          </div>
        ) : cats.length === 0 ? (
          <div className="empty-card">
            <p>No cats added yet. Create your first cat profile.</p>
          </div>
        ) : (
          <div className="cats-grid">
            {cats.map((cat) => {
              const vaccinations = normalizeVaccinations(cat.vaccinations);
              const statusMeta = getStatusMeta(cat);
              const isOnFoster =
                cat.listingType === 'foster' || cat.listingStatus === 'pending';

              return (
                <article key={cat.id} className="cat-card">
                  <div className="cat-card-head">
                    <div>
                      <h3>{cat.name}</h3>
                      <p>{cat.breed || 'Breed not specified'}</p>
                    </div>

                    <span className={`status-badge ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="cat-meta">
                    <span>
                      <strong>Age:</strong> {cat.age ?? 'Not specified'}
                    </span>
                    <span>
                      <strong>Vaccinations:</strong>{' '}
                      {vaccinations.length > 0 ? `${vaccinations.length} added` : 'Not added'}
                    </span>
                  </div>

                  <div className="cat-expanded-content">
                    <p className="cat-description">
                      {cat.description || 'No description yet.'}
                    </p>

                    <h4>Vaccinations</h4>
                    <p className="cat-vaccinations-text">
                      {vaccinations.length > 0
                        ? vaccinations.join(', ')
                        : 'No vaccinations added yet.'}
                    </p>

                    <div className="cat-card-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setSelectedVaccinationCat(cat)}
                      >
                        Vaccinations
                      </button>

                      <button
                        type="button"
                        className="cat-edit-btn"
                        onClick={() => openEditCatModal(cat)}
                      >
                        <Pencil size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="cat-delete-btn"
                        onClick={() => handleDeleteCat(cat)}
                        disabled={deleteLoadingId === cat.id}
                      >
                        <Trash2 size={16} />
                        {deleteLoadingId === cat.id ? 'Deleting...' : 'Delete'}
                      </button>

                      <button
                        type="button"
                        className="cat-foster-btn"
                        onClick={() => handleFosterCat(cat)}
                        disabled={fosterLoadingId === cat.id || isOnFoster}
                      >
                        {fosterLoadingId === cat.id
                          ? 'Sending...'
                          : isOnFoster
                          ? 'On foster'
                          : 'Put on foster'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {isCatModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingCat ? 'Edit Cat' : 'Add a Cat'}</h3>
              <button type="button" className="modal-close" onClick={closeCatModal}>
                <X size={18} />
              </button>
            </div>

            <form className="cat-form" onSubmit={handleSaveCat}>
              <div className="form-group">
                <label>Cat Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Enter cat name"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Breed</label>
                  <input
                    type="text"
                    value={form.breed}
                    onChange={(e) => handleFormChange('breed', e.target.value)}
                    placeholder="Enter breed"
                  />
                </div>

                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    min="0"
                    value={form.age}
                    onChange={(e) => handleFormChange('age', e.target.value)}
                    placeholder="Enter age"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => handleFormChange('gender', e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Tell something about your cat"
                />
              </div>

              <div className="form-group">
                <label>Vaccinations</label>
                <input
                  type="text"
                  value={form.vaccinationsText}
                  onChange={(e) => handleFormChange('vaccinationsText', e.target.value)}
                  placeholder="Example: Rabies, FVRCP, Deworming"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeCatModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saveLoading}>
                  {saveLoading
                    ? 'Saving...'
                    : editingCat
                    ? 'Save Changes'
                    : 'Create Cat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedVaccinationCat && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{selectedVaccinationCat.name} vaccinations</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedVaccinationCat(null)}
              >
                <X size={18} />
              </button>
            </div>

            {normalizeVaccinations(selectedVaccinationCat.vaccinations).length > 0 ? (
              <div className="cat-vaccination-list">
                {normalizeVaccinations(selectedVaccinationCat.vaccinations).map(
                  (item, index) => (
                    <span key={index} className="cat-vaccination-chip">
                      {item}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="cat-vaccinations-empty">No vaccinations added yet.</p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSelectedVaccinationCat(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  );
};

export default DashboardPage;