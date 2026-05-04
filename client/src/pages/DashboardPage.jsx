import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useMessages } from '../components/MessagesContext';

const CATS_API = `${import.meta.env.VITE_API_BASE_URL || ''}/api/cats`;
const USERS_API = `${import.meta.env.VITE_API_BASE_URL || ''}/api/users`;

const emptyForm = {
  name: '',
  breed: '',
  gender: '',
  birthDate: '',
  description: '',
  vaccinationInput: '',
  vaccinations: [],
  imageFile: null,
  imagePreview: '',
};

const emptyFosterForm = {
  startDate: '',
  endDate: '',
  comment: '',
  location: '',
};

const normalizeVaccinations = (vaccinations) => {
  if (Array.isArray(vaccinations)) {
    return vaccinations
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  return [];
};

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const fromUserObject = Number(user.userId || user.id);
    if (Number.isFinite(fromUserObject) && fromUserObject > 0) {
      return fromUserObject;
    }
  } catch {
    // fallback to legacy storage keys below
  }

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

const formatBirthDate = (birthDate) => {
  if (!birthDate) return 'Not specified';
  return birthDate;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { notify, confirm } = useMessages();
  const userId = getCurrentUserId();
  const userName = localStorage.getItem('userName') || 'Alex Johnson';

  const [cats, setCats] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [fosterLoadingId, setFosterLoadingId] = useState(null);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [openCalendarAfterSave, setOpenCalendarAfterSave] = useState(false);

  const [selectedVaccinationCat, setSelectedVaccinationCat] = useState(null);

  const [isFosterModalOpen, setIsFosterModalOpen] = useState(false);
  const [selectedFosterCat, setSelectedFosterCat] = useState(null);
  const [fosterForm, setFosterForm] = useState(emptyFosterForm);

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

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`${USERS_API}/profile/${userId}`);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || 'Failed to load user profile');
        }

        setUserProfile(data);
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const fosterCount = useMemo(
    () =>
      cats.filter(
        (cat) => cat.listingType === 'foster' || cat.listingStatus === 'pending'
      ).length,
    [cats]
  );

  const openAddCatModal = () => {
    setEditingCat(null);
    setForm({ ...emptyForm });
    setIsCatModalOpen(true);
  };

  const openEditCatModal = (cat) => {
    setEditingCat(cat);
    setForm({
      name: cat.name || '',
      breed: cat.breed || '',
      gender: cat.gender || '',
      birthDate: cat.birthDate || '',
      description: cat.description || '',
      vaccinationInput: '',
      vaccinations: normalizeVaccinations(cat.vaccinations),
      imageFile: null,
      imagePreview: cat.image_url || '',
    });
    setIsCatModalOpen(true);
  };

  const closeCatModal = () => {
    setIsCatModalOpen(false);
    setEditingCat(null);
    setForm(emptyForm);
    setOpenCalendarAfterSave(false);
    setForm({ ...emptyForm });
  };

  const openFosterModal = (cat) => {
    setSelectedFosterCat(cat);
    setFosterForm({
      startDate: '',
      endDate: '',
      comment: '',
      location: userProfile?.address || localStorage.getItem('userAddress') || '',
    });
    setIsFosterModalOpen(true);
  };

  const closeFosterModal = () => {
    setIsFosterModalOpen(false);
    setSelectedFosterCat(null);
    setFosterForm({ ...emptyFosterForm });
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFosterFormChange = (field, value) => {
    setFosterForm((prev) => ({ ...prev, [field]: value }));
  };

  const addVaccination = () => {
    const value = form.vaccinationInput.trim();
    if (!value) return;

    if (form.vaccinations.includes(value)) {
      setForm((prev) => ({ ...prev, vaccinationInput: '' }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      vaccinations: [...prev.vaccinations, value],
      vaccinationInput: '',
    }));
  };

  const removeVaccination = (itemToRemove) => {
    setForm((prev) => ({
      ...prev,
      vaccinations: prev.vaccinations.filter((item) => item !== itemToRemove),
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setForm((prev) => ({
        ...prev,
        imageFile: null,
        imagePreview: '',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();

    if (!userId) {
      await notify('User ID is missing. Please log in first.', { type: 'error', title: 'Error' });
      return;
    }

    if (!form.name.trim()) {
      await notify('Cat name is required.', { type: 'error', title: 'Error' });
      return;
    }

    try {
      setSaveLoading(true);

      const formData = new FormData();
      formData.append('userId', String(userId));

      if (editingCat?.shelterId) {
        formData.append('shelterId', String(editingCat.shelterId));
      }

      formData.append('name', form.name.trim());
      formData.append('breed', form.breed.trim());
      formData.append('gender', form.gender);
      formData.append('birthDate', form.birthDate || '');
      formData.append('description', form.description.trim());
      formData.append('vaccinations', JSON.stringify(form.vaccinations));
      formData.append('source', 'private');
      formData.append('sourceType', 'private');
      formData.append('listingType', editingCat?.listingType || 'adoption');
      formData.append('listingStatus', editingCat?.listingStatus || 'active');

      if (form.imageFile) {
        formData.append('image', form.imageFile);
      }

      const response = await fetch(
        editingCat ? `${CATS_API}/${editingCat.id}` : CATS_API,
        {
          method: editingCat ? 'PUT' : 'POST',
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to save cat');
      }

      closeCatModal();
      await fetchMyCats();

      const savedCatId = Number(data?.id);
      if (openCalendarAfterSave && Number.isInteger(savedCatId) && savedCatId > 0) {
        navigate(`/cats/${savedCatId}/vaccinations`, { state: { cat: data } });
      }
    } catch (error) {
      console.error(error);
      await notify(error.message || 'Failed to save cat.', { type: 'error', title: 'Error' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteCat = async (cat) => {
    const confirmed = await confirm(`Delete ${cat.name}?`, {
      type: 'error',
      title: 'Confirm delete',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
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
      await notify(error.message || 'Failed to delete cat.', { type: 'error', title: 'Error' });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleFosterCat = async (e) => {
    e.preventDefault();

    if (!selectedFosterCat) return;

    if (!fosterForm.startDate || !fosterForm.endDate) {
      await notify('Please select foster period.', { type: 'error', title: 'Error' });
      return;
    }

    if (fosterForm.endDate < fosterForm.startDate) {
      await notify('End date cannot be earlier than start date.', { type: 'error', title: 'Error' });
      return;
    }

    try {
      setFosterLoadingId(selectedFosterCat.id);

      const fosterResponse = await fetch(
        `${CATS_API}/${selectedFosterCat.id}/foster-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            cat_id: selectedFosterCat.id,
            start_date: fosterForm.startDate,
            end_date: fosterForm.endDate,
            comment: fosterForm.comment,
            location: fosterForm.location,
          }),
        }
      );

      const fosterData = await fosterResponse.json().catch(() => ({}));

      if (!fosterResponse.ok) {
        throw new Error(fosterData?.message || 'Failed to send foster request');
      }

      const updateResponse = await fetch(`${CATS_API}/${selectedFosterCat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingType: 'foster',
          listingStatus: 'pending',
          previousListingType:
            selectedFosterCat.previousListingType ||
            selectedFosterCat.listingType ||
            'adoption',
          previousListingStatus:
            selectedFosterCat.previousListingStatus ||
            selectedFosterCat.listingStatus ||
            'active',
          sourceType: selectedFosterCat.sourceType || 'private',
          source: selectedFosterCat.source || 'private',
        }),
      });

      const updateData = await updateResponse.json().catch(() => ({}));

      if (!updateResponse.ok) {
        throw new Error(updateData?.message || 'Failed to update foster status');
      }

      await fetchMyCats();
      closeFosterModal();
      await notify(`${selectedFosterCat.name} was successfully submitted for fostering.`, { type: 'success', title: 'Success' });
    } catch (error) {
      console.error(error);
      await notify('Failed to submit foster request. Please try again.', { type: 'error', title: 'Error' });
    } finally {
      setFosterLoadingId(null);
    }
  };

  const handleWithdrawFoster = async (cat) => {
    const confirmed = window.confirm(`Withdraw foster request for ${cat.name}?`);
    if (!confirmed) return;

    try {
      setFosterLoadingId(cat.id);

      const response = await fetch(`${CATS_API}/${cat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingType: cat.previousListingType || 'adoption',
          listingStatus: cat.previousListingStatus || 'active',
          previousListingType: null,
          previousListingStatus: null,
          sourceType: cat.sourceType || 'private',
          source: cat.source || 'private',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to withdraw foster');
      }

      await fetchMyCats();
      await notify(`${cat.name} was successfully withdrawn from fostering.`, { type: 'success', title: 'Success' });
    } catch (error) {
      console.error(error);
      await notify('Failed to withdraw foster request. Please try again.', { type: 'error', title: 'Error' });
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
            <div
              className="achievement-badge clickable"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/achievements')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/achievements');
              }}
              title="Open achievements"
            >
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
          <button className="ai-action-btn" onClick={() => navigate('/chat')}>
            <MessageSquare />
          </button>
        </div>

        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>

        <div className="quick-actions-grid">
          <div className="action-card" onClick={openAddCatModal}>
            <div className="action-icon">
              <PlusCircle />
            </div>
            <h4>Add a Cat</h4>
            <p>Create your cat profile</p>
          </div>

          <div className="action-card">
            <div className="action-icon">
              <Users />
            </div>
            <h4>Community</h4>
            <p>Connect with others</p>
          </div>

          <div className="action-card">
            <div className="action-icon">
              <MapPin />
            </div>
            <h4>Find Vet</h4>
            <p>Nearby clinics</p>
          </div>

          <div className="action-card" onClick={() => navigate('/achievements')}>
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
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      style={{
                        width: '100%',
                        height: '220px',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        marginBottom: '14px',
                      }}
                    />
                  ) : null}

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
                      <strong>Birth date:</strong> {formatBirthDate(cat.birthDate)}
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
                        className={isOnFoster ? 'cat-withdraw-btn' : 'cat-foster-btn'}
                        onClick={() => {
                        if (isOnFoster) {
                        handleWithdrawFoster(cat);
                        } else {
                        openFosterModal(cat);
                        }
                        }}
                        disabled={fosterLoadingId === cat.id}
>
                       {fosterLoadingId === cat.id
                       ? (isOnFoster ? 'Updating...' : 'Sending...')
                       : (isOnFoster ? 'Withdraw foster' : 'Put on foster')}
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
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Cat name"
                />
              </div>

              <div className="form-group">
                <label>Breed</label>
                <input
                  type="text"
                  value={form.breed}
                  onChange={(e) => handleFormChange('breed', e.target.value)}
                  placeholder="Breed"
                />
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
                <label>Birth date</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleFormChange('birthDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Add vaccinations</label>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={form.vaccinationInput}
                    onChange={(e) => handleFormChange('vaccinationInput', e.target.value)}
                    placeholder="Add vaccination"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={addVaccination}
                  >
                    + Add vaccine
                  </button>
                </div>

                {form.vaccinations.length > 0 && (
                  <div className="cat-vaccination-list" style={{ marginTop: '12px' }}>
                    {form.vaccinations.map((item, index) => (
                      <button
                        key={`${item}-${index}`}
                        type="button"
                        className="cat-vaccination-chip"
                        onClick={() => removeVaccination(item)}
                        title="Remove vaccination"
                      >
                        {item} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Detailed cat description"
                />
              </div>

              <div className="form-group">
                <label>Vaccinations</label>
                {editingCat?.id ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      closeCatModal();
                      navigate(`/cats/${editingCat.id}/vaccinations`, {
                        state: { cat: editingCat },
                      });
                    }}
                    style={{ width: '100%' }}
                  >
                    Open vaccination calendar
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="secondary-btn"
                    onClick={() => setOpenCalendarAfterSave(true)}
                    style={{ width: '100%' }}
                    title="Save cat and open calendar"
                  >
                    Save & open vaccination calendar
                  </button>
                )}
                <label>Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />

                {form.imagePreview && (
                  <div style={{ marginTop: '12px' }}>
                    <img
                      src={form.imagePreview}
                      alt="Cat preview"
                      style={{
                        width: '160px',
                        height: '160px',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        border: '1px solid #f3d3ae',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeCatModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Save Cat'}
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

      {isFosterModalOpen && selectedFosterCat && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Foster Request</h3>
              <button type="button" className="modal-close" onClick={closeFosterModal}>
                <X size={18} />
              </button>
            </div>

            <form className="cat-form" onSubmit={handleFosterCat}>
              <div className="foster-preview">
                {selectedFosterCat.image_url ? (
                  <img
                    src={selectedFosterCat.image_url}
                    alt={selectedFosterCat.name}
                    className="foster-preview-image"
                  />
                ) : (
                  <div className="foster-preview-placeholder">
                    <Cat size={36} />
                  </div>
                )}

                <div className="foster-preview-info">
                  <h4>{selectedFosterCat.name}</h4>
                  <p>
                    <strong>Breed:</strong> {selectedFosterCat.breed || 'Not specified'}
                  </p>
                  <p>
                    <strong>Description:</strong>{' '}
                    {selectedFosterCat.description || 'No description yet.'}
                  </p>
                  <p>
                    <strong>Character:</strong>{' '}
                    {selectedFosterCat.personality || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={fosterForm.location}
                  onChange={(e) => handleFosterFormChange('location', e.target.value)}
                  placeholder="Enter city or location"
                />
              </div>

              <div className="foster-period-grid">
                <div className="form-group">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={fosterForm.startDate}
                    onChange={(e) => handleFosterFormChange('startDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>End date</label>
                  <input
                    type="date"
                    value={fosterForm.endDate}
                    onChange={(e) => handleFosterFormChange('endDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Comment</label>
                <textarea
                  rows="4"
                  value={fosterForm.comment}
                  onChange={(e) => handleFosterFormChange('comment', e.target.value)}
                  placeholder="Additional comment about foster period"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeFosterModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={fosterLoadingId === selectedFosterCat.id}
                >
                  {fosterLoadingId === selectedFosterCat.id ? 'Sending...' : 'Send Request'}
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

export default DashboardPage;