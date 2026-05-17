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
import { useI18n } from '../i18n/I18nContext';
import { apiUrl } from '../utils/apiUrl';
import { resolveUploadedImageUrl } from '../utils/mediaUrl';

const API_BASE_URL = apiUrl('/api/cats');
const EVENTS_API = apiUrl('/api/events');
const SHELTER_API_BASE_URL = apiUrl('/api/shelter');

const normalizeVaccinations = (vaccinations) => {
  if (!Array.isArray(vaccinations)) return [];

  return vaccinations
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
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

/** Resolve shelter + build query for manager-scoped event APIs. */
const resolveManagerShelterContext = async () => {
  const { userId, shelterId: storedShelterId } = getCurrentUserIds();
  let shelterId = storedShelterId;

  if (!shelterId && userId) {
    try {
      const response = await fetch(apiUrl(`/api/shelter/profile/${userId}`));
      if (response.ok) {
        const profile = await response.json();
        const resolved = Number(profile?.shelterId);
        if (Number.isInteger(resolved) && resolved > 0) {
          shelterId = resolved;
        }
      }
    } catch {
      /* optional */
    }
  }

  return { userId, shelterId };
};

const buildManagerEventsQuery = ({ userId, shelterId }) => {
  const params = new URLSearchParams();
  if (shelterId) params.set('shelterId', String(shelterId));
  if (userId) params.set('userId', String(userId));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

const ManagerProfile = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { notify, confirm } = useMessages();

  const topRef = useRef(null);

  const formatGender = useCallback(
    (gender) => {
      if (gender === 'male') return t('gal.male');
      if (gender === 'female') return t('gal.female');
      return t('db.notSpecified');
    },
    [t],
  );

  const formatListingStatus = useCallback(
    (status) => {
      const key = status === 'adopted' ? 'mgr.listingAdopted' : 'mgr.listingActive';
      return t(key);
    },
    [t],
  );

  const formatEventStatus = useCallback(
    (status) => {
      const map = {
        active: 'mgr.eventStatusActive',
        inactive: 'mgr.eventStatusInactive',
        cancelled: 'mgr.eventStatusCancelled',
        completed: 'mgr.eventStatusCompleted',
      };
      return map[status] ? t(map[status]) : status;
    },
    [t],
  );

  const [shelterName, setShelterName] = useState('');
  const [shelterLogo, setShelterLogo] = useState('');
  const [myCats, setMyCats] = useState([]);
  const [catVaccinations, setCatVaccinations] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openCalendarAfterSave, setOpenCalendarAfterSave] = useState(false);
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
    eventTime: '',
    location: '',
    cost: '',
    maxParticipants: '',
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
    vaccinations: [],
  });

  const [requests, setRequests] = useState([]);

  const fetchCatVaccinations = useCallback(async (catList) => {
    if (!Array.isArray(catList) || catList.length === 0) {
      setCatVaccinations({});
      return;
    }

    const records = {};

    await Promise.all(
      catList.map(async (cat) => {
        try {
          const response = await fetch(`${API_BASE_URL}/${cat.id}/vaccinations`);
          if (!response.ok) {
            records[cat.id] = [];
            return;
          }

          const data = await response.json();
          records[cat.id] = Array.isArray(data) ? data : [];
        } catch (error) {
          console.error('Failed to load vaccinations for cat', cat.id, error);
          records[cat.id] = [];
        }
      }),
    );

    setCatVaccinations(records);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setShelterName(parsed.shelterName || parsed.name || t('mgr.defaultShelter'));
        setShelterLogo(parsed.logo || '');
      } catch {
        setShelterName(t('mgr.defaultShelter'));
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
        await fetchCatVaccinations(filteredCats);
      } catch (error) {
        console.error('Failed to load cats from API:', error);
        setMyCats([]);
        setCatVaccinations({});
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
  }, [t, fetchCatVaccinations]);

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
      notify(t('mgrReq.errUpdate'), { type: 'error', title: t('msg.errorTitle') });
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
      vaccinations: [],
    });
    setEditingCatId(null);
    setCatImageFile(null);
    setCatImagePreview('');
    setOpenCalendarAfterSave(false);
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
      vaccinations: normalizeVaccinations(cat.vaccinations),
    });
    setCatImageFile(null);
    setCatImagePreview(cat.image_url || '');
    setOpenCalendarAfterSave(false);
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
    } else if (catImagePreview && !String(catImagePreview).startsWith('blob:')) {
      formData.append('image_url', catImagePreview);
    }

    try {
      const shouldOpenCalendar = openCalendarAfterSave;

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
        closeCatModal();
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

        const savedId = Number(savedCat?.id);
        closeCatModal();
        if (shouldOpenCalendar && Number.isInteger(savedId) && savedId > 0) {
          navigate(`/manager/cats/${savedId}/vaccinations`, { state: { cat: savedCat } });
        }
      }
    } catch (error) {
      console.error('Failed to save cat:', error);
      await notify(t('mgr.errSaveCat'), {
        type: 'error',
        title: t('msg.errorTitle'),
      });
    }
  };

  const handleDeleteCat = async (catId) => {
    const confirmed = await confirm(t('mgr.deleteCatConfirm'), {
      type: 'confirm',
      title: t('mgr.deleteCatTitle'),
      confirmText: t('db.deleteYes'),
      cancelText: t('common.cancel'),
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
      setCatVaccinations((prev) => {
        const next = { ...prev };
        delete next[catId];
        return next;
      });

      if (editingCatId === catId) {
        closeCatModal();
      }
    } catch (error) {
      console.error('Failed to delete cat:', error);
      await notify(t('mgr.errDeleteCat'), {
        type: 'error',
        title: t('msg.errorTitle'),
      });
    }
  };

  const formatAge = useCallback(
    (birthDate) => {
      if (!birthDate) return t('db.notSpecified');

      const birth = new Date(birthDate);
      if (Number.isNaN(birth.getTime())) return t('db.notSpecified');

      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();

      if (months < 0) {
        years -= 1;
        months += 12;
      }

      const yearLabel = years === 1 ? t('mgr.ageYear') : t('mgr.ageYears');
      const monthLabel = months === 1 ? t('mgr.ageMonth') : t('mgr.ageMonths');

      if (years <= 0) {
        return `${months} ${monthLabel}`;
      }

      return months > 0
        ? `${years} ${yearLabel} ${months} ${monthLabel}`
        : `${years} ${yearLabel}`;
    },
    [t],
  );

  const showPlaceholder = (label) => {
    notify(t('mgr.placeholderLater', { label }), { type: 'info', title: t('msg.infoTitle') });
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      imageFile: null,
      imagePreview: '',
      date: '',
      eventTime: '',
      location: '',
      cost: '',
      maxParticipants: '',
      status: 'active'
    });
    setEditingEvent(null);
  };

  const fetchEvents = useCallback(async () => {
    try {
      const scope = await resolveManagerShelterContext();
      const response = await fetch(`${EVENTS_API}${buildManagerEventsQuery(scope)}`);
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
      eventTime: event.event_time || event.eventTime || '',
      location: event.location || '',
      cost: event.cost || '',
      maxParticipants:
        event.max_participants != null && event.max_participants !== ''
          ? String(event.max_participants)
          : event.maxParticipants != null
            ? String(event.maxParticipants)
            : '',
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
      await notify(t('mgr.eventTitleRequired'), { type: 'error', title: t('msg.errorTitle') });
      return;
    }

    const { userId: currentUserId, shelterId: currentShelterId } =
      await resolveManagerShelterContext();
    const scopeQuery = buildManagerEventsQuery({
      userId: currentUserId,
      shelterId: currentShelterId,
    });

    const formData = new FormData();
    formData.append('title', eventForm.title.trim());
    formData.append('description', eventForm.description.trim());
    formData.append('date', eventForm.date || '');
    formData.append('event_time', eventForm.eventTime || '');
    formData.append('location', eventForm.location.trim());
    formData.append('cost', eventForm.cost.trim());
    formData.append('max_participants', eventForm.maxParticipants.trim());
    formData.append('status', eventForm.status);

    if (currentShelterId) {
      formData.append('shelterId', String(currentShelterId));
    }
    if (currentUserId) {
      formData.append('userId', String(currentUserId));
    }

    if (eventForm.imageFile) {
      formData.append('image', eventForm.imageFile);
    } else if (eventForm.imagePreview && !String(eventForm.imagePreview).startsWith('blob:')) {
      formData.append('image_url', eventForm.imagePreview);
    }

    try {
      let response;
      let savedEvent;

      if (editingEvent) {
        response = await fetch(`${EVENTS_API}/${editingEvent.id}${scopeQuery}`, {
          method: 'PUT',
          body: formData,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const detail =
            errBody.message || errBody.error || `Request failed (${response.status})`;
          throw new Error(detail);
        }

        savedEvent = await response.json();
        console.log('рџ–јпёЏ Frontend received saved event:', savedEvent);
        setEvents(prev => prev.map(event => 
          event.id === editingEvent.id ? savedEvent : event
        ));
        await notify(t('mgr.eventUpdated'), { type: 'success', title: t('msg.successTitle') });
      } else {
        response = await fetch(EVENTS_API, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const detail =
            errBody.message || errBody.error || `Request failed (${response.status})`;
          throw new Error(detail);
        }

        savedEvent = await response.json();
        setEvents(prev => [savedEvent, ...prev]);
        await notify(t('mgr.eventAdded'), { type: 'success', title: t('msg.successTitle') });
      }

      closeEventModal();
    } catch (error) {
      console.error('Failed to save event:', error);
      const msg =
        error?.message &&
        !['Failed to create event', 'Failed to update event', 'Failed to fetch'].includes(
          error.message,
        )
          ? error.message
          : t('mgr.errSaveEvent');
      await notify(msg, {
        type: 'error',
        title: t('msg.errorTitle'),
      });
    }
  };

  const handleUpdateEventStatus = async (eventId, newStatus) => {
    try {
      const scopeQuery = buildManagerEventsQuery(await resolveManagerShelterContext());
      const response = await fetch(`${EVENTS_API}/${eventId}/status${scopeQuery}`, {
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
      await notify(t('mgr.eventStatusUpdated', { status: formatEventStatus(newStatus) }), {
        type: 'success',
        title: t('msg.successTitle'),
      });
    } catch (error) {
      console.error('Failed to update event status:', error);
      await notify(t('mgr.errUpdateEventStatus'), {
        type: 'error',
        title: t('msg.errorTitle'),
      });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = await confirm(t('mgr.deleteEventConfirm'), {
      type: 'confirm',
      title: t('mgr.deleteEventTitle'),
      confirmText: t('db.deleteYes'),
      cancelText: t('common.cancel'),
    });
    
    if (!confirmed) return;

    try {
      const scopeQuery = buildManagerEventsQuery(await resolveManagerShelterContext());
      const response = await fetch(`${EVENTS_API}/${eventId}${scopeQuery}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      await notify(t('mgr.eventDeleted'), { type: 'success', title: t('msg.successTitle') });
    } catch (error) {
      console.error('Failed to delete event:', error);
      await notify(t('mgr.errDeleteEvent'), {
        type: 'error',
        title: t('msg.errorTitle'),
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
                  alt={t('profMgr.logoAlt')}
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
              <h1>{t('mgr.hello', { name: shelterName })}</h1>
              <p>{t('mgr.dashboardSub')}</p>
            </div>
          </div>

          <button
            className="hero-icon-btn"
            type="button"
            onClick={() => navigate('/manager/settings')}
            title={t('mgr.settingsTitle')}
          >
            <FiBell size={20} />
          </button>
        </div>

        <div className="stats-card">
          <div className="section-chip">{t('mgr.statsChip')}</div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.available}</span>
              <span className="stat-label">{t('mgr.statAvailable')}</span>
            </div>

            <div className="stat-card">
              <span className="stat-number">{stats.adopted}</span>
              <span className="stat-label">{t('mgr.statAdopted')}</span>
            </div>

            <div className="stat-card">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">{t('mgr.statTotal')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="manager-content">
        <section className="manager-section">
          <div className="section-head">
            <div>
              <h2>{t('mgr.activeReq')}</h2>
              <p>{t('mgr.activeReqSub')}</p>
            </div>
            <span className="section-count">{pendingRequests.length}</span>
          </div>

          <div className="requests-list">
            {pendingRequests.length === 0 ? (
              <div className="empty-card">
                <p>{t('mgr.noPendingReq')}</p>
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
                        {t('mgr.applicantLine', {
                          name: request.applicant,
                          time: request.time,
                        })}
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
                      {t('mgrReq.approveBtn')}
                    </button>

                    <button
                      className="reject-btn"
                      type="button"
                      onClick={() => handleRequestAction(request.id, 'rejected')}
                    >
                      <FiX size={16} />
                      {t('mgrReq.rejectBtn')}
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
              <h2>{t('mgr.mgmtActions')}</h2>
              <p>{t('mgr.mgmtSub')}</p>
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
              <h3>{t('db.addCatBtn')}</h3>
              <p>{t('mgr.addCatSub')}</p>
            </button>

            <button
              className="action-card"
              type="button"
              onClick={() => navigate('/pharmacies')}
            >
              <div className="action-icon">
                <FiMapPin size={22} />
              </div>
              <h3>{t('mgr.vetPharm')}</h3>
              <p>{t('mgr.vetPharmSub')}</p>
            </button>

            <button
              className="action-card"
              type="button"
              onClick={openAddEventModal}
            >
              <div className="action-icon">
                <FiCalendar size={22} />
              </div>
              <h3>{t('mgr.addEvents')}</h3>
              <p>{t('mgr.addEventsSub')}</p>
            </button>

            <button
              className="action-card"
              type="button"
              onClick={() => navigate('/manager/needs')}
            >
              <div className="action-icon">
                <FiClipboard size={22} />
              </div>
              <h3>{t('mgr.needsTitle')}</h3>
              <p>{t('mgr.needsSub')}</p>
            </button>
          </div>
        </section>

        <section className="manager-section">
          <div className="section-head">
            <div>
              <h2>{t('mgr.myCats')}</h2>
              <p>{t('mgr.catsSub')}</p>
            </div>
            <span className="section-count">{myCats.length}</span>
          </div>

          {isLoadingCats ? (
            <div className="empty-card">
              <p>{t('mgr.loadingCats')}</p>
            </div>
          ) : myCats.length === 0 ? (
            <div className="empty-card">
              <p>{t('mgr.noCats')}</p>
            </div>
          ) : (
            <div className="cats-grid">
              {myCats.map((cat) => {
                const savedVaccinations = Array.isArray(catVaccinations[cat.id])
                  ? catVaccinations[cat.id]
                  : normalizeVaccinations(cat.vaccinations).map((name) => ({ name }));
                const vaccinationNames = savedVaccinations
                  .map((item) => (typeof item === 'string' ? item : item?.name))
                  .map((name) => (typeof name === 'string' ? name.trim() : ''))
                  .filter(Boolean);

                return (
                  <article
                    key={cat.id}
                    className="cat-card clickable-cat-card expanded-cat-card"
                  >
                    <div className="cat-card-head">
                      <div>
                        <h3>{cat.name || t('mgr.unnamedCat')}</h3>
                        <p>{cat.breed || t('db.breedUnknown')}</p>
                      </div>

                      <span className={`status-badge ${cat.listingStatus || 'active'}`}>
                        {formatListingStatus(cat.listingStatus || 'active')}
                      </span>
                    </div>

                    {cat.image_url && (
                      <img
                        src={resolveUploadedImageUrl(cat.image_url)}
                        alt={cat.name || t('mgr.catAlt')}
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
                        <strong>{t('db.labelGender')}:</strong> {formatGender(cat.gender)}
                      </span>
                      <span>
                        <strong>{t('mgr.labelAge')}:</strong> {formatAge(cat.birthDate)}
                      </span>
                      <span>
                        <strong>{t('db.vaccinations')}:</strong>{' '}
                        {vaccinationNames.length > 0
                          ? vaccinationNames.length
                          : t('mgr.vaxNotAdded')}
                      </span>
                    </div>

                    <div className="cat-expanded-content">
                      <p className="cat-description">
                        {cat.description || t('db.noDesc')}
                      </p>

                      <div className="cat-vaccination-block">
                        <p className="cat-vaccination-title">{t('db.vaccinations')}</p>

                        {vaccinationNames.length > 0 ? (
                          <div className="cat-vaccination-list">
                            {vaccinationNames.map((item, index) => (
                              <span key={`${item}-${index}`} className="cat-vaccination-chip">
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="no-vaccinations-text">
                            {t('db.vaxNone')}
                          </p>
                        )}
                      </div>

                      <div className="cat-card-actions">
                        <button
                          type="button"
                          className="cat-edit-btn"
                          onClick={() => openVaccinationPage(cat)}
                        >
                          {t('db.btnVax')}
                        </button>

                        <button
                          type="button"
                          className="cat-edit-btn"
                          onClick={() => openEditCatModal(cat)}
                        >
                          {t('mgr.editProfile')}
                        </button>

                        <button
                          type="button"
                          className="cat-delete-btn"
                          onClick={() => handleDeleteCat(cat.id)}
                        >
                          {t('mgr.deleteProfile')}
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
              <h2>{t('mgr.events')}</h2>
              <p>{t('mgr.eventsSub')}</p>
            </div>
            <span className="section-count">{events.length}</span>
          </div>

          {events.length === 0 ? (
            <div className="empty-card">
              <p>{t('mgr.noEvents')}</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <article key={event.id} className="event-card expanded-event-card">
                  {event.image_url && (
                    <img
                      src={resolveUploadedImageUrl(event.image_url)}
                      alt={event.title}
                    />
                  )}
                  
                  <div className="event-card-head">
                    <div>
                      <h3>{event.title}</h3>
                      <p>{event.location}</p>
                    </div>
                    <span className={`status-badge ${event.status}`}>
                      {formatEventStatus(event.status)}
                    </span>
                  </div>

                  <div className="event-meta">
                    <span>
                      <strong>{t('mgr.labelDate')}:</strong>{' '}
                      {event.date || t('mgr.dateNotSet')}
                      {(event.event_time || event.eventTime) &&
                        ` \u00b7 ${event.event_time || event.eventTime}`}
                    </span>
                    <span>
                      <strong>{t('mgr.labelParticipants')}:</strong>{' '}
                      {t('mgr.participantsCount', {
                        count: event.participants_count ?? 0,
                        max:
                          event.max_participants != null
                            ? event.max_participants
                            : event.maxParticipants != null
                              ? event.maxParticipants
                              : 'в€ћ',
                      })}
                    </span>
                    <span><strong>{t('mgr.labelCost')}:</strong> {event.cost || t('mgr.costFree')}</span>
                  </div>

                  <div className="event-expanded-content">
                    <p className="event-description">
                      {event.description || t('db.noDesc')}
                    </p>

                    <div className="event-card-actions">
                      <button
                        type="button"
                        className="cat-edit-btn"
                        onClick={() => openEditEventModal(event)}
                      >
                        {t('db.btnEdit')}
                      </button>
                      
                      <select
                        value={event.status}
                        onChange={(e) => handleUpdateEventStatus(event.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="active">{t('mgr.eventStatusActive')}</option>
                        <option value="inactive">{t('mgr.eventStatusInactive')}</option>
                        <option value="cancelled">{t('mgr.eventStatusCancelled')}</option>
                        <option value="completed">{t('mgr.eventStatusCompleted')}</option>
                      </select>

                      <button
                        type="button"
                        className="cat-delete-btn"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        {t('db.btnDelete')}
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
              <h3>{editingCatId ? t('mgr.editCatProfile') : t('mgr.addNewCat')}</h3>
              <button
                className="modal-close"
                type="button"
                onClick={closeCatModal}
                aria-label={t('gal.closeModal')}
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCat} className="cat-form">
              <div className="form-group">
                <label>{t('db.labelName')}</label>
                <input
                  type="text"
                  value={newCatData.name}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('db.phCatName')}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelBreed')}</label>
                <input
                  type="text"
                  value={newCatData.breed}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, breed: e.target.value }))
                  }
                  placeholder={t('db.phBreed')}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelGender')}</label>
                <select
                  value={newCatData.gender}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  required
                >
                  <option value="">{t('db.genderSelect')}</option>
                  <option value="male">{t('gal.male')}</option>
                  <option value="female">{t('gal.female')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('db.labelBirth')}</label>
                <input
                  type="date"
                  value={newCatData.birthDate}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, birthDate: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelPersonality')}</label>
                <input
                  type="text"
                  value={newCatData.personality}
                  onChange={(e) =>
                    setNewCatData((prev) => ({ ...prev, personality: e.target.value }))
                  }
                  placeholder={t('db.phPersonality')}
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelPhoto')}</label>
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
                    alt={t('db.catPreview')}
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
                <label>{t('db.labelDesc')}</label>
                <textarea
                  value={newCatData.description}
                  onChange={(e) =>
                    setNewCatData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t('db.phDesc')}
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('db.vaccinations')}</label>
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
                    {t('db.openCal')}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="secondary-btn"
                    onClick={() => setOpenCalendarAfterSave(true)}
                    style={{ width: '100%' }}
                    title={t('db.saveOpenCalTitle')}
                  >
                    {t('db.saveOpenCal')}
                  </button>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeCatModal}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  onClick={() => setOpenCalendarAfterSave(false)}
                >
                  {editingCatId ? t('mgr.saveChanges') : t('db.saveCat')}
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
              <h3>{editingEvent ? t('mgr.editEvent') : t('mgr.addNewEvent')}</h3>
              <button
                className="modal-close"
                type="button"
                onClick={closeEventModal}
                aria-label={t('gal.closeModal')}
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="event-form">
              <div className="form-group">
                <label>{t('mgr.labelEventTitle')}</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => handleEventFormChange('title', e.target.value)}
                  placeholder={t('mgr.phEventTitle')}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelDesc')}</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => handleEventFormChange('description', e.target.value)}
                  placeholder={t('mgr.phEventDesc')}
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('mgr.labelEventPoster')}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEventImageChange}
                />
                {eventForm.imagePreview && (
                  <img
                    src={eventForm.imagePreview}
                    alt={t('mgr.eventPreview')}
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

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>{t('mgr.labelDate')}</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => handleEventFormChange('date', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('mgr.labelEventTime')}</label>
                  <input
                    type="time"
                    value={eventForm.eventTime}
                    onChange={(e) => handleEventFormChange('eventTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('mgr.labelMaxParticipants')}</label>
                <input
                  type="number"
                  min="1"
                  value={eventForm.maxParticipants}
                  onChange={(e) => handleEventFormChange('maxParticipants', e.target.value)}
                  placeholder={t('mgr.phMaxParticipants')}
                />
              </div>

              <div className="form-group">
                <label>{t('mgr.labelLocation')}</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => handleEventFormChange('location', e.target.value)}
                  placeholder={t('mgr.phLocation')}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('mgr.labelCost')}</label>
                <input
                  type="text"
                  value={eventForm.cost}
                  onChange={(e) => handleEventFormChange('cost', e.target.value)}
                  placeholder={t('mgr.phCost')}
                />
              </div>

              <div className="form-group">
                <label>{t('db.status')}</label>
                <select
                  value={eventForm.status}
                  onChange={(e) => handleEventFormChange('status', e.target.value)}
                >
                  <option value="active">{t('mgr.eventStatusActive')}</option>
                  <option value="inactive">{t('mgr.eventStatusInactive')}</option>
                  <option value="cancelled">{t('mgr.eventStatusCancelled')}</option>
                  <option value="completed">{t('mgr.eventStatusCompleted')}</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeEventModal}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="primary-btn">
                  {editingEvent ? t('mgr.saveChanges') : t('mgr.addEventBtn')}
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
