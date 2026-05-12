import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useMessages } from '../components/MessagesContext';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/cats`;
const EVENTS_API = `${import.meta.env.VITE_API_BASE_URL || ''}/api/events`;
const SHELTER_API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/shelter`;

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

const getCurrentUserIds = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      return { userId: null, shelterId: null };
    }

    const parsedUser = JSON.parse(rawUser);
    const parsedUserId = Number(parsedUser?.userId ?? parsedUser?.id);
    const parsedShelterId = Number(parsedUser?.shelterId);

    return {
      userId: Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null,
      shelterId:
        Number.isInteger(parsedShelterId) && parsedShelterId > 0 ? parsedShelterId : null,
    };
  } catch {
    return { userId: null, shelterId: null };
  }
};

const ManagerProfile = () => {
  const navigate = useNavigate();
  const { notify, confirm } = useMessages();

  const topRef = useRef(null);

  const [shelterName, setShelterName] = useState('Happy Paws Shelter');
  const [shelterLogo, setShelterLogo] = useState('');
  const [myCats, setMyCats] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const [catImageFile, setCatImageFile] = useState(null);
  const [catImagePreview, setCatImagePreview] = useState('');

  const [events, setEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    imageFile: null,
    imagePreview: '',
    date: '',
    location: '',
    cost: '',
    status: 'active'
  });

  useEffect(() => {
    return () => {
      if (catImagePreview && catImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(catImagePreview);
      }
    };
  }, [catImagePreview]);

  const [newCatData, setNewCatData] = useState({
    name: '',
    breed: '',
    gender: '',
    birthDate: '',
    personality: '',
    description: '',
    vaccinationInput: '',
    vaccinations: [],
  });

  const [requests, setRequests] = useState([]);

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
        const { userId: currentUserId, shelterId: currentShelterId } = getCurrentUserIds();

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

        const filteredCats = apiCats.filter((cat) => {
          const catShelterId = Number(cat.shelterId);
          const catUserId = Number(cat.userId);

          if (currentShelterId && Number.isInteger(catShelterId) && catShelterId > 0) {
            return catShelterId === currentShelterId;
          }

          if (currentUserId && Number.isInteger(catUserId) && catUserId > 0) {
            return catUserId === currentUserId;
          }

          return false;
        });

        setMyCats(filteredCats);
      } catch (error) {
        console.error('Failed to load cats from API:', error);
        setMyCats([]);
      } finally {
        setIsLoadingCats(false);
      }
    };

    const loadRequests = async () => {
      try {
        const { userId: currentUserId } = getCurrentUserIds();
        if (!currentUserId) {
          setRequests([]);
          return;
        }

        const response = await fetch(`${SHELTER_API_BASE_URL}/requests/${currentUserId}`);
        if (!response.ok) {
          throw new Error('Failed to load requests');
        }

        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load shelter requests:', error);
        setRequests([]);
      }
    };

    loadCats();
    loadRequests();
  }, []);

  const stats = useMemo(() => {
    return {
      available: myCats.filter((cat) => cat.listingStatus === 'active').length,
      adopted: myCats.filter((cat) => cat.listingStatus === 'adopted').length,
      total: myCats.length,
    };
  }, [myCats]);

  const pendingRequests = requests.filter((request) => request.status === 'pending');

  const handleRequestAction = async (requestId, newStatus) => {
    try {
      const { userId: currentUserId } = getCurrentUserIds();
      const response = await fetch(`${SHELTER_API_BASE_URL}/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, userId: currentUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update request');
      }

      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, status: newStatus } : request
        )
      );
    } catch (error) {
      console.error('Failed to update request:', error);
      notify('Failed to update request status.', { type: 'error', title: 'Error' });
    }
  };

  const resetCatForm = () => {
    setNewCatData({
      name: '',
      breed: '',
      gender: '',
      birthDate: '',
      personality: '',
      description: '',
      vaccinationInput: '',
      vaccinations: [],
    });
    setEditingCatId(null);
    setCatImageFile(null);
    setCatImagePreview('');
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
      personality: cat.personality || '',
      description: cat.description || '',
      vaccinationInput: '',
      vaccinations: normalizeVaccinations(cat.vaccinations),
    });
    setCatImageFile(null);
    setCatImagePreview(cat.image_url || '');
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

  const addVaccination = () => {
    const value = (newCatData.vaccinationInput || '').trim();
    if (!value) return;

    if (newCatData.vaccinations.includes(value)) {
      setNewCatData((prev) => ({ ...prev, vaccinationInput: '' }));
      return;
    }

    setNewCatData((prev) => ({
      ...prev,
      vaccinations: [...prev.vaccinations, value],
      vaccinationInput: '',
    }));
  };

  const removeVaccination = (itemToRemove) => {
    setNewCatData((prev) => ({
      ...prev,
      vaccinations: prev.vaccinations.filter((item) => item !== itemToRemove),
    }));
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();

    const existingCat = myCats.find((cat) => cat.id === editingCatId);
    const { userId: currentUserId, shelterId: currentShelterId } = getCurrentUserIds();

    const formData = new FormData();
    formData.append('name', newCatData.name.trim());
    formData.append('breed', newCatData.breed.trim());
    formData.append('gender', newCatData.gender || '');
    formData.append('birthDate', newCatData.birthDate || '');
    formData.append('personality', newCatData.personality || '');
    formData.append('description', newCatData.description.trim());
    formData.append('vaccinations', JSON.stringify(newCatData.vaccinations || []));
    formData.append('sourceType', existingCat?.sourceType || 'shelter');
    formData.append('listingType', existingCat?.listingType || 'adoption');
    formData.append('listingStatus', existingCat?.listingStatus || 'active');
    if (existingCat?.shelterId || currentShelterId) {
      formData.append('shelterId', String(existingCat?.shelterId || currentShelterId));
    }
    if (existingCat?.userId || currentUserId) {
      formData.append('userId', String(existingCat?.userId || currentUserId));
    }

    if (catImageFile) {
      formData.append('image', catImageFile);
    } else if (catImagePreview) {
      formData.append('image_url', catImagePreview);
    }

    try {
      if (editingCatId) {
        const response = await fetch(`${API_BASE_URL}/${editingCatId}`, {
          method: 'PUT',
          body: formData,
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
          body: formData,
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
      await notify('Failed to save cat profile. Please check the backend connection.', {
        type: 'error',
        title: 'Error',
      });
    }
  };

  const handleDeleteCat = async (catId) => {
    const confirmed = await confirm('Are you sure you want to delete this cat profile? This action cannot be undone.', {
      type: 'confirm',
      title: 'Delete cat profile',
      confirmText: 'Yes, delete',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${catId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete cat');
      }

      setMyCats((prev) => prev.filter((cat) => cat.id !== catId));

      if (editingCatId === catId) {
        closeCatModal();
      }
    } catch (error) {
      console.error('Failed to delete cat:', error);
      await notify('Failed to delete cat profile. Please check the backend connection.', {
        type: 'error',
        title: 'Error',
      });
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
    notify(`${label} will be added later`, { type: 'info', title: 'Info' });
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      imageFile: null,
      imagePreview: '',
      date: '',
      location: '',
      cost: '',
      status: 'active'
    });
    setEditingEvent(null);
  };

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(EVENTS_API);
      if (!response.ok) {
        throw new Error('Failed to load events');
      }
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const openAddEventModal = () => {
    resetEventForm();
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      imageFile: null,
      imagePreview: event.image_url || '',
      date: event.date || '',
      location: event.location || '',
      cost: event.cost || '',
      status: event.status || 'active'
    });
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    resetEventForm();
    setIsEventModalOpen(false);
  };

  const handleEventFormChange = (field, value) => {
    setEventForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEventImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setEventForm(prev => ({
        ...prev,
        imageFile: null,
        imagePreview: ''
      }));
      return;
    }
    setEventForm(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file)
    }));
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    
    if (!eventForm.title.trim()) {
      await notify('Event title is required.', { type: 'error', title: 'Error' });
      return;
    }

    const { userId: currentUserId, shelterId: currentShelterId } = getCurrentUserIds();

    const formData = new FormData();
    formData.append('title', eventForm.title.trim());
    formData.append('description', eventForm.description.trim());
    formData.append('date', eventForm.date || '');
    formData.append('location', eventForm.location.trim());
    formData.append('cost', eventForm.cost.trim());
    formData.append('status', eventForm.status);
    
    if (currentShelterId) {
      formData.append('shelterId', String(currentShelterId));
    }
    if (currentUserId) {
      formData.append('userId', String(currentUserId));
    }

    if (eventForm.imageFile) {
      formData.append('image', eventForm.imageFile);
    } else if (eventForm.imagePreview) {
      formData.append('image_url', eventForm.imagePreview);
    }

    try {
      let response;
      let savedEvent;

      if (editingEvent) {
        response = await fetch(`${EVENTS_API}/${editingEvent.id}`, {
          method: 'PUT',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to update event');
        }

        savedEvent = await response.json();
        console.log('🖼️ Frontend received saved event:', savedEvent);
        setEvents(prev => prev.map(event => 
          event.id === editingEvent.id ? savedEvent : event
        ));
        await notify('Event updated successfully!', { type: 'success', title: 'Success' });
      } else {
        response = await fetch(EVENTS_API, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to create event');
        }

        savedEvent = await response.json();
        setEvents(prev => [savedEvent, ...prev]);
        await notify('Event added successfully!', { type: 'success', title: 'Success' });
      }

      closeEventModal();
    } catch (error) {
      console.error('Failed to save event:', error);
      await notify('Failed to save event. Please check the backend connection.', { 
        type: 'error', 
        title: 'Error' 
      });
    }
  };

  const handleUpdateEventStatus = async (eventId, newStatus) => {
    try {
      const response = await fetch(`${EVENTS_API}/${eventId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update event status');
      }

      const updatedEvent = await response.json();
      setEvents(prev => prev.map(event => 
        event.id === eventId ? updatedEvent : event
      ));
      await notify(`Event status updated to ${newStatus}`, { type: 'success', title: 'Success' });
    } catch (error) {
      console.error('Failed to update event status:', error);
      await notify('Failed to update event status. Please check the backend connection.', { 
        type: 'error', 
        title: 'Error' 
      });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = await confirm('Are you sure you want to delete this event? This action cannot be undone.', {
      type: 'confirm',
      title: 'Delete event',
      confirmText: 'Yes, delete',
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;

    try {
      const response = await fetch(`${EVENTS_API}/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      setEvents(prev => prev.filter(event => event.id !== eventId));
      await notify('Event deleted successfully!', { type: 'success', title: 'Success' });
    } catch (error) {
      console.error('Failed to delete event:', error);
      await notify('Failed to delete event. Please check the backend connection.', { 
        type: 'error', 
        title: 'Error' 
      });
    }
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
                        {request.typeLabel || request.type}: {request.catName}
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
              onClick={openAddEventModal}
            >
              <div className="action-icon">
                <FiCalendar size={22} />
              </div>
              <h3>Add Events</h3>
              <p>Create a new event</p>
            </button>

            <button
              className="action-card"
              type="button"
              onClick={() => navigate('/manager/needs')}
            >
              <div className="action-icon">
                <FiClipboard size={22} />
              </div>
              <h3>Needs</h3>
              <p>Manage shelter support requests</p>
            </button>
          </div>
        </section>

        <section className="manager-section">
          <div className="section-head">
            <div>
              <h2>My cats</h2>
              <p>Edit, delete, or open vaccinations for each cat profile</p>
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
                const vaccinations = normalizeVaccinations(cat.vaccinations);

                return (
                  <article
                    key={cat.id}
                    className="cat-card clickable-cat-card expanded-cat-card"
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

                    {cat.image_url && (
                      <img
                        src={cat.image_url}
                        alt={cat.name || 'Cat'}
                        style={{
                          width: '100%',
                          height: '260px',
                          objectFit: 'contain',
                          background: '#f7f8fa',
                          borderRadius: '12px',
                          marginTop: '12px',
                        }}
                      />
                    )}

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
                          onClick={() => openVaccinationPage(cat)}
                        >
                          Vaccinations
                        </button>

                        <button
                          type="button"
                          className="cat-edit-btn"
                          onClick={() => openEditCatModal(cat)}
                        >
                          Edit profile
                        </button>

                        <button
                          type="button"
                          className="cat-delete-btn"
                          onClick={() => handleDeleteCat(cat.id)}
                        >
                          Delete profile
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="manager-section">
          <div className="section-head">
            <div>
              <h2>Events</h2>
              <p>Manage shelter events and activities</p>
            </div>
            <span className="section-count">{events.length}</span>
          </div>

          {events.length === 0 ? (
            <div className="empty-card">
              <p>No events yet. Create your first event.</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <article key={event.id} className="event-card expanded-event-card">
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt={event.title}
                    />
                  )}
                  
                  <div className="event-card-head">
                    <div>
                      <h3>{event.title}</h3>
                      <p>{event.location}</p>
                    </div>
                    <span className={`status-badge ${event.status}`}>
                      {event.status}
                    </span>
                  </div>

                  <div className="event-meta">
                    <span><strong>Date:</strong> {event.date || 'Not set'}</span>
                    <span><strong>Cost:</strong> {event.cost || 'Free'}</span>
                  </div>

                  <div className="event-expanded-content">
                    <p className="event-description">
                      {event.description || 'No description yet.'}
                    </p>

                    <div className="event-card-actions">
                      <button
                        type="button"
                        className="cat-edit-btn"
                        onClick={() => openEditEventModal(event)}
                      >
                        Edit
                      </button>
                      
                      <select
                        value={event.status}
                        onChange={(e) => handleUpdateEventStatus(event.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        type="button"
                        className="cat-delete-btn"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
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
                <label>Personality</label>
                <input
                  type="text"
                  value={newCatData.personality}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, personality: e.target.value }))
                  }
                  placeholder="e.g. playful, calm, social"
                />
              </div>

              <div className="form-group">
                <label>Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setCatImageFile(file || null);
                    if (file) {
                      setCatImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
                {catImagePreview && (
                  <img
                    src={catImagePreview}
                    alt="Cat preview"
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      marginTop: '8px',
                    }}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Vaccinations</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newCatData.vaccinationInput}
                    onChange={(e) =>
                      setNewCatData((prev) => ({ ...prev, vaccinationInput: e.target.value }))
                    }
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

                {newCatData.vaccinations.length > 0 && (
                  <div className="cat-vaccination-list" style={{ marginTop: '12px' }}>
                    {newCatData.vaccinations.map((item, index) => (
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

                {editingCatId ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      closeCatModal();
                      const cat = myCats.find((item) => item.id === editingCatId) || null;
                      navigate(`/manager/cats/${editingCatId}/vaccinations`, { state: { cat } });
                    }}
                    style={{ width: '100%' }}
                  >
                    Open vaccination calendar
                  </button>
                ) : null}
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

      {isEventModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
              <button
                className="modal-close"
                type="button"
                onClick={closeEventModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="event-form">
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => handleEventFormChange('title', e.target.value)}
                  placeholder="Event title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => handleEventFormChange('description', e.target.value)}
                  placeholder="Event description"
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>Photo/Poster</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEventImageChange}
                />
                {eventForm.imagePreview && (
                  <img
                    src={eventForm.imagePreview}
                    alt="Event preview"
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      marginTop: '8px'
                    }}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => handleEventFormChange('date', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => handleEventFormChange('location', e.target.value)}
                  placeholder="Event location"
                  required
                />
              </div>

              <div className="form-group">
                <label>Cost</label>
                <input
                  type="text"
                  value={eventForm.cost}
                  onChange={(e) => handleEventFormChange('cost', e.target.value)}
                  placeholder="e.g., Free, 50 UAH, 100-200 UAH"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={eventForm.status}
                  onChange={(e) => handleEventFormChange('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeEventModal}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingEvent ? 'Save Changes' : 'Add Event'}
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