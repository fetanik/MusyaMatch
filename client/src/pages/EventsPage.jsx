import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiCalendar, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';
import '../styles/EventsPage.css'; 

const getEventsApiBaseUrl = () => {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!rawBase) return '/api/events';
  const normalized = rawBase.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${normalized}/api/events`;
};

const API_BASE_URL = getEventsApiBaseUrl();

const emptyForm = {
  title: '',
  description: '',
  eventDate: '',
  eventTime: '',
  location: '',
  status: 'upcoming',
};

const EventsPage = () => {
  const navigate = useNavigate();
  const { notify, confirm } = useMessages();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');

  const getCurrentUser = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = Number(parsed.userId || parsed.id);
      const shelterId = Number(parsed.shelterId);
      return {
        userId: Number.isInteger(userId) && userId > 0 ? userId : null,
        shelterId: Number.isInteger(shelterId) && shelterId > 0 ? shelterId : null,
      };
    } catch {
      return { userId: null, shelterId: null };
    }
  };

  const loadEvents = useCallback(async () => {
    const { userId, shelterId } = getCurrentUser();
    const params = new URLSearchParams();

    if (shelterId) params.set('shelterId', String(shelterId));
    if (userId) params.set('userId', String(userId));

    const url = params.toString() ? `${API_BASE_URL}?${params.toString()}` : API_BASE_URL;

    try {
      setIsLoading(true);
      setLoadError('');
      const response = await fetch(url);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'Failed to load shelter events');
      }
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load events:', error);
      setLoadError('Could not load events. Please try again.');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openAddModal = () => {
    setEditingEventId(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEventId(event.id);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      eventDate: event.eventDate || '',
      eventTime: event.eventTime || '',
      location: event.location || '',
      status: event.status || 'upcoming',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEventId(null);
    setFormData(emptyForm);
    setFormError('');
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = await confirm('Are you sure you want to delete this event? This action cannot be undone.', {
      type: 'confirm',
      title: 'Delete event',
      confirmText: 'Yes, delete',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${eventId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete event');
      await loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      await notify('Failed to delete event. Please try again.', { type: 'error', title: 'Error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = formData.title.trim();

    if (!trimmedTitle) {
      setFormError('Title is required.');
      return;
    }

    const { userId, shelterId } = getCurrentUser();
    const payload = { ...formData, title: trimmedTitle, userId, shelterId };

    try {
      setIsSaving(true);
      setFormError('');
      const response = await fetch(
        editingEventId ? `${API_BASE_URL}/${editingEventId}` : API_BASE_URL,
        {
          method: editingEventId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'Failed to save event');
      }

      closeModal();
      await loadEvents();
      await notify('Event saved successfully!', { type: 'success' });
    } catch (error) {
      console.error('Failed to save event:', error);
      setFormError(error.message || 'Failed to save event.');
    } finally {
      setIsSaving(false);
    }
  };

  const upcomingEventsCount = useMemo(
    () => events.filter((e) => e.status === 'upcoming').length,
    [events]
  );

  return (
    <div className="events-page">
      <header className="events-hero">
        <div className="events-header-row">
          <button
            type="button"
            className="events-back-btn"
            onClick={() => navigate('/manager-profile')}
            aria-label="Back to manager profile"
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="events-title-wrap">
            <h1>Shelter Events</h1>
            <p>Manage planned shelter activities</p>
          </div>
        </div>
      </header>

      <main className="events-content">
        <section className="events-summary-card">
          <div className="events-summary-icon">
            <FiCalendar size={20} />
          </div>
          <div className="events-summary-text">
            <h2>Upcoming events</h2>
            <p>{upcomingEventsCount} planned activities</p>
          </div>
          <button type="button" className="events-primary-btn" onClick={openAddModal}>
            <FiPlus size={18} />
            Add Event
          </button>
        </section>

        <section className="events-section">
          <div className="events-section-head">
            <h2>Event list</h2>
            <span className="events-count">{events.length}</span>
          </div>

          {isLoading ? (
            <div className="events-empty-card"><h3>Loading events...</h3></div>
          ) : loadError ? (
            <div className="events-empty-card">
              <h3>Could not load events</h3>
              <p>{loadError}</p>
              <button type="button" className="events-primary-btn" onClick={loadEvents}>Try Again</button>
            </div>
          ) : events.length === 0 ? (
            <div className="events-empty-card">
              <h3>No events yet</h3>
              <p>Create your first event to engage with the community.</p>
              <button type="button" className="events-primary-btn" onClick={openAddModal}>
                <FiPlus size={18} /> Add Event
              </button>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <article key={event.id} className="event-card">
                  <div className="event-card-head">
                    <h3>{event.title}</h3>
                    <span className={`event-status-badge ${event.status}`}>{event.status}</span>
                  </div>
                  <p className="event-description">{event.description}</p>
                  <div className="event-meta">
                    <span className="event-meta-chip">{event.eventDate} {event.eventTime}</span>
                    {event.location && <span className="event-meta-chip">{event.location}</span>}
                  </div>
                  <div className="event-actions">
                    <button type="button" className="event-edit-btn" onClick={() => openEditModal(event)}>
                      <FiEdit2 size={15} /> Edit
                    </button>
                    <button type="button" className="event-delete-btn" onClick={() => handleDeleteEvent(event.id)}>
                      <FiTrash2 size={15} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="events-modal-overlay">
          <div className="events-modal-card">
            <div className="events-modal-head">
              <h3>{editingEventId ? 'Edit Event' : 'Add New Event'}</h3>
              <button type="button" className="events-modal-close" onClick={closeModal}>
                <FiX size={18} />
              </button>
            </div>
            <form className="events-form" onSubmit={handleSubmit}>
              <div className="events-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Charity Fair"
                  required
                />
              </div>
              <div className="events-form-row">
                <div className="events-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    required
                  />
                </div>
                <div className="events-form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={formData.eventTime}
                    onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="events-form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Shelter address or online link"
                />
              </div>
              <div className="events-form-group">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event details..."
                />
              </div>
              <div className="events-form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {formError && <div className="events-form-alert">{formError}</div>}

              <div className="events-form-actions">
                <button type="button" className="events-secondary-btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="events-primary-btn" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingEventId ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <BottomNav active="calendar" /> {/* Встановив active="calendar" для підсвітки у меню */}
    </div>
  );
};

export default EventsPage;