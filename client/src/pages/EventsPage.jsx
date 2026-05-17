import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, CreditCard, Info, Users } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useI18n } from '../i18n/I18nContext';
import { useMessages } from '../components/MessagesContext';
import { apiUrl } from '../utils/apiUrl';
import { resolveUploadedImageUrl } from '../utils/mediaUrl';
import '../styles/DashboardPage.css';
import '../styles/Gallery.css';

const EVENTS_API = apiUrl('/api/events');
const USERS_API = apiUrl('/api/users');

const emptyJoinForm = { phone: '', comment: '' };

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const fromUserObject = Number(user.userId || user.id);
    if (Number.isFinite(fromUserObject) && fromUserObject > 0) {
      return fromUserObject;
    }
  } catch {
    /* fallback below */
  }
  const raw =
    localStorage.getItem('userId') ||
    localStorage.getItem('basicUserId') ||
    localStorage.getItem('currentUserId');
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getCurrentUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (user?.name || user?.firstName || '').trim() || localStorage.getItem('userName') || '';
  } catch {
    return localStorage.getItem('userName') || '';
  }
};

const getStoredUserPhone = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (user?.phone || '').trim();
  } catch {
    return '';
  }
};

const EventsPage = () => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { notify } = useMessages();
  const currentUserId = getCurrentUserId();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinedEventIds, setJoinedEventIds] = useState(() => new Set());

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [joinForm, setJoinForm] = useState(() => ({ ...emptyJoinForm, phone: getStoredUserPhone() }));
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinError, setJoinError] = useState('');

  const fetchJoinedEvents = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const response = await fetch(
        `${EVENTS_API}/registrations?userId=${encodeURIComponent(currentUserId)}`,
      );
      if (!response.ok) return;
      const data = await response.json();
      const ids = new Set(
        (Array.isArray(data) ? data : []).map((row) => Number(row.eventId)).filter((id) => id > 0),
      );
      setJoinedEventIds(ids);
    } catch {
      /* optional */
    }
  }, [currentUserId]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(EVENTS_API);
        if (!response.ok) {
          throw new Error('Failed to load events');
        }

        const data = await response.json();
        const activeEvents = (Array.isArray(data) ? data : []).filter(
          (event) => event.status === 'active',
        );
        setEvents(activeEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(t('evt.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    fetchJoinedEvents();
  }, [t, fetchJoinedEvents]);

  useEffect(() => {
    if (!selectedEvent) return undefined;

    const onEscape = (event) => {
      if (event.key === 'Escape') setSelectedEvent(null);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) return undefined;

    setJoinMessage('');
    setJoinError('');
    setJoinForm({
      ...emptyJoinForm,
      phone: getStoredUserPhone(),
    });

    let cancelled = false;
    if (!currentUserId) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const response = await fetch(`${USERS_API}/profile/${currentUserId}`);
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const fromApi = (data?.phone || '').trim();
        if (!cancelled && fromApi) {
          setJoinForm((prev) => ({ ...prev, phone: fromApi }));
        }
      } catch {
        /* profile optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent, currentUserId]);

  const formatDate = (dateString) => {
    if (!dateString) return t('evt.dateNotSet');
    const dateLocale = locale === 'uk' ? 'uk-UA' : 'en-US';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(dateLocale, options);
  };

  const formatEventSchedule = (event) => {
    const datePart = formatDate(event?.date);
    const time = (event?.event_time || event?.eventTime || '').trim();
    return time ? `${datePart}, ${time}` : datePart;
  };

  const formatParticipants = (event) => {
    const count = event?.participants_count ?? 0;
    const max = event?.max_participants ?? event?.maxParticipants ?? null;
    if (max == null || max === '') {
      return t('evt.participantsUnlimited', { count });
    }
    return t('evt.participantsLimited', { count, max });
  };

  const refreshEvents = async () => {
    const response = await fetch(EVENTS_API);
    if (!response.ok) return;
    const data = await response.json();
    const activeEvents = (Array.isArray(data) ? data : []).filter(
      (event) => event.status === 'active',
    );
    setEvents(activeEvents);
  };

  const openJoinModal = (event) => {
    if (!currentUserId) {
      notify(t('gal.loginFirst'), { type: 'warning', title: t('msg.errorTitle') });
      navigate('/register');
      return;
    }
    if (joinedEventIds.has(event.id)) {
      notify(t('evt.alreadyJoined'), { type: 'info' });
      return;
    }
    if (event.is_full) {
      notify(t('evt.eventFull'), { type: 'warning', title: t('msg.errorTitle') });
      return;
    }
    setSelectedEvent(event);
  };

  const closeJoinModal = () => {
    setSelectedEvent(null);
    setJoinMessage('');
    setJoinError('');
  };

  const onJoinFormChange = (key, value) => {
    setJoinForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleJoinSubmit = async () => {
    if (!selectedEvent?.id || joinSubmitting) return;
    if (!currentUserId) {
      setJoinError(t('gal.loginFirst'));
      return;
    }

    const phoneTrim = joinForm.phone.trim();
    if (phoneTrim.length < 5 || phoneTrim.length > 50) {
      setJoinError(t('gal.fosterPhoneInvalid'));
      return;
    }

    try {
      setJoinSubmitting(true);
      setJoinError('');
      setJoinMessage('');

      const response = await fetch(`${EVENTS_API}/${selectedEvent.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          phone: phoneTrim,
          comment: joinForm.comment.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) {
          setJoinedEventIds((prev) => new Set(prev).add(selectedEvent.id));
        }
        throw new Error(payload.message || t('evt.joinFail'));
      }

      setJoinMessage(payload.message || t('evt.joinSuccess'));
      setJoinedEventIds((prev) => new Set(prev).add(selectedEvent.id));
      await refreshEvents();

      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.phone = phoneTrim;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      } catch {
        /* ignore */
      }

      notify(t('evt.joinSuccess'), { type: 'success' });
    } catch (submitError) {
      setJoinError(submitError.message || t('evt.joinFail'));
    } finally {
      setJoinSubmitting(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header-bg" style={{ paddingBottom: '20px' }}>
        <header className="profile-header">
          <div className="user-info">
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                marginRight: '10px',
              }}
              aria-label={t('common.back')}
            >
              <ArrowLeft size={24} />
            </button>
            <div className="text-info">
              <h1>{t('evt.title')}</h1>
              <p>{t('evt.subtitle')}</p>
            </div>
          </div>
        </header>
      </div>

      <div className="profile-content">
        {loading ? (
          <div className="empty-card">
            <p>{t('evt.loading')}</p>
          </div>
        ) : error ? (
          <div className="empty-card">
            <p style={{ color: 'red' }}>{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-card">
            <Calendar size={48} color="#ccc" style={{ marginBottom: '10px' }} />
            <p>{t('evt.empty')}</p>
          </div>
        ) : (
          <div className="cats-grid">
            {events.map((event) => {
              const imageSrc = resolveUploadedImageUrl(event.image_url);
              const alreadyJoined = joinedEventIds.has(event.id);
              const isFull = Boolean(event.is_full);
              return (
                <article key={event.id} className="cat-card">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={event.title}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        marginBottom: '14px',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '200px',
                        backgroundColor: '#f0f0f0',
                        borderRadius: '16px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Calendar size={40} color="#aaa" />
                    </div>
                  )}

                  <div className="cat-card-head" style={{ marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{event.title}</h3>
                  </div>

                  <div
                    className="cat-meta"
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} /> {formatEventSchedule(event)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} /> {formatParticipants(event)}
                    </span>
                    {event.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={16} /> {event.location}
                      </span>
                    )}
                    {event.cost && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={16} /> {event.cost}
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <div
                      style={{
                        marginTop: '14px',
                        paddingTop: '14px',
                        borderTop: '1px solid #eee',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#555',
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        {event.description}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-foster-request"
                    style={{ marginTop: '16px', width: '100%' }}
                    onClick={() => openJoinModal(event)}
                    disabled={alreadyJoined || isFull}
                  >
                    {alreadyJoined
                      ? t('evt.joined')
                      : isFull
                        ? t('evt.eventFull')
                        : t('evt.join')}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav active="home" />

      {selectedEvent && (
        <div
          className="cat-modal-backdrop"
          role="presentation"
          onClick={closeJoinModal}
        >
          <article
            className="cat-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('evt.joinModalAria', { title: selectedEvent.title })}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="cat-modal-close"
              onClick={closeJoinModal}
              aria-label={t('gal.closeModal')}
            >
              {'\u00D7'}
            </button>

            {resolveUploadedImageUrl(selectedEvent.image_url) ? (
              <img
                className="cat-modal-image"
                src={resolveUploadedImageUrl(selectedEvent.image_url)}
                alt={selectedEvent.title}
              />
            ) : (
              <div
                className="cat-modal-image"
                style={{ display: 'grid', placeItems: 'center', color: '#9aa3b2' }}
              >
                <Calendar size={48} />
              </div>
            )}

            <div className="cat-modal-content">
              <h3>{selectedEvent.title}</h3>
              <p className="cat-modal-meta">
                {formatEventSchedule(selectedEvent)}
                {selectedEvent.location ? ` • ${selectedEvent.location}` : ''}
              </p>
              <p className="cat-modal-meta">{formatParticipants(selectedEvent)}</p>
              {selectedEvent.description && (
                <p className="cat-modal-description">{selectedEvent.description}</p>
              )}

              <div className="cat-modal-actions">
                <div className="request-form-panel">
                  <div className="request-form-field">
                    <label htmlFor="event-join-user">{t('gal.fosterUser')}</label>
                    <input
                      id="event-join-user"
                      type="text"
                      readOnly
                      value={getCurrentUserName() || t('gal.fosterUserPlaceholder')}
                    />
                  </div>
                  <div className="request-form-field">
                    <label htmlFor="event-join-phone">{t('gal.fosterPhone')}</label>
                    <input
                      id="event-join-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder={t('gal.fosterPhonePh')}
                      value={joinForm.phone}
                      onChange={(e) => onJoinFormChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="request-form-field">
                    <label htmlFor="event-join-comment">{t('gal.fosterComment')}</label>
                    <textarea
                      id="event-join-comment"
                      rows={3}
                      placeholder={t('evt.joinCommentPh')}
                      value={joinForm.comment}
                      onChange={(e) => onJoinFormChange('comment', e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-foster-request"
                    onClick={handleJoinSubmit}
                    disabled={
                      joinSubmitting ||
                      joinedEventIds.has(selectedEvent.id) ||
                      selectedEvent.is_full
                    }
                  >
                    {joinSubmitting ? t('gal.sending') : t('evt.joinSubmit')}
                  </button>
                  {joinMessage && <p className="foster-success">{joinMessage}</p>}
                  {joinError && <p className="form-error">{joinError}</p>}
                </div>
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
