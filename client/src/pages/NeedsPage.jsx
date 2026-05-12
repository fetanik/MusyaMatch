import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiClipboard, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';
import '../styles/NeedsPage.css';

const getNeedsApiBaseUrl = () => {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!rawBase) {
    return '/api/needs';
  }

  const normalized = rawBase.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${normalized}/api/needs`;
};

const API_BASE_URL = getNeedsApiBaseUrl();
const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const emptyForm = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  status: 'open',
};

const NeedsPage = () => {
  const navigate = useNavigate();
  const { notify, confirm } = useMessages();
  const [needs, setNeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNeedId, setEditingNeedId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');

  const getCurrentUser = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('user') || '{}');
      const userId =
        toPositiveInt(parsed.userId) ??
        toPositiveInt(parsed.id) ??
        toPositiveInt(localStorage.getItem('userId')) ??
        toPositiveInt(localStorage.getItem('basicUserId')) ??
        toPositiveInt(localStorage.getItem('currentUserId'));
      const shelterId =
        toPositiveInt(parsed.shelterId) ??
        toPositiveInt(parsed.shelter_id) ??
        toPositiveInt(localStorage.getItem('shelterId')) ??
        toPositiveInt(localStorage.getItem('currentShelterId'));

      return {
        userId,
        shelterId,
      };
    } catch {
      return {
        userId:
          toPositiveInt(localStorage.getItem('userId')) ??
          toPositiveInt(localStorage.getItem('basicUserId')) ??
          toPositiveInt(localStorage.getItem('currentUserId')),
        shelterId:
          toPositiveInt(localStorage.getItem('shelterId')) ??
          toPositiveInt(localStorage.getItem('currentShelterId')),
      };
    }
  };

  const loadNeeds = useCallback(async () => {
    const { userId, shelterId } = getCurrentUser();
    const params = new URLSearchParams();

    if (shelterId) {
      params.set('shelterId', String(shelterId));
    }
    if (userId) {
      params.set('userId', String(userId));
    }

    const url = params.toString() ? `${API_BASE_URL}?${params.toString()}` : API_BASE_URL;

    try {
      setIsLoading(true);
      setLoadError('');

      const response = await fetch(url);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'Failed to load shelter needs');
      }

      const data = await response.json();
      setNeeds(Array.isArray(data) ? data : []);
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

  const openAddModal = () => {
    setEditingNeedId(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (need) => {
    setEditingNeedId(need.id);
    setFormData({
      title: need.title || '',
      description: need.description || '',
      category: need.category || '',
      priority: need.priority || 'medium',
      status: need.status || 'open',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNeedId(null);
    setFormData(emptyForm);
    setFormError('');
  };

  const handleDeleteNeed = async (needId) => {
    const confirmed = await confirm('Are you sure you want to delete this need? This action cannot be undone.', {
      type: 'confirm',
      title: 'Delete need',
      confirmText: 'Yes, delete',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${needId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete need');
      }

      await loadNeeds();
    } catch (error) {
      console.error('Failed to delete need:', error);
      await notify('Failed to delete need. Please try again.', { type: 'error', title: 'Error' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = formData.title.trim();

    if (!trimmedTitle) {
      setFormError('Title is required.');
      return;
    }

    const { userId, shelterId } = getCurrentUser();
    if (!userId && !shelterId) {
      setFormError('Please log in again before creating needs.');
      await notify('Could not detect your profile. Please re-login and try again.', {
        type: 'error',
        title: 'Profile required',
      });
      return;
    }
    const payload = {
      title: trimmedTitle,
      description: formData.description.trim(),
      category: formData.category.trim() || 'General',
      priority: formData.priority,
      status: formData.status,
      userId,
      shelterId,
    };

    try {
      setIsSaving(true);
      setFormError('');

      const response = await fetch(
        editingNeedId ? `${API_BASE_URL}/${editingNeedId}` : API_BASE_URL,
        {
          method: editingNeedId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'Failed to save need');
      }

      closeModal();
      await loadNeeds();
    } catch (error) {
      console.error('Failed to save need:', error);
      setFormError(error.message || 'Failed to save need.');
      await notify('Failed to save need. Please try again.', { type: 'error', title: 'Error' });
    } finally {
      setIsSaving(false);
    }
  };

  const openNeedsCount = useMemo(
    () => needs.filter((need) => need.status === 'open').length,
    [needs]
  );

  return (
    <div className="needs-page">
      <header className="needs-hero">
        <div className="needs-header-row">
          <button
            type="button"
            className="needs-back-btn"
            onClick={() => navigate('/manager-profile')}
            aria-label="Back to manager profile"
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="needs-title-wrap">
            <h1>Shelter Needs</h1>
            <p>Manage current shelter needs and support requests</p>
          </div>
        </div>
      </header>

      <main className="needs-content">
        <section className="needs-summary-card">
          <div className="needs-summary-icon">
            <FiClipboard size={20} />
          </div>

          <div className="needs-summary-text">
            <h2>Current requests</h2>
            <p>{openNeedsCount} open needs waiting for support</p>
          </div>

          <button type="button" className="needs-primary-btn" onClick={openAddModal}>
            <FiPlus size={18} />
            Add Need
          </button>
        </section>

        <section className="needs-section">
          <div className="needs-section-head">
            <h2>Need list</h2>
            <span className="needs-count">{needs.length}</span>
          </div>

          {isLoading ? (
            <div className="needs-empty-card">
              <h3>Loading needs...</h3>
            </div>
          ) : loadError ? (
            <div className="needs-empty-card">
              <h3>Could not load needs</h3>
              <p>{loadError}</p>
              <button type="button" className="needs-primary-btn" onClick={loadNeeds}>
                Try Again
              </button>
            </div>
          ) : needs.length === 0 ? (
            <div className="needs-empty-card">
              <h3>No needs yet</h3>
              <p>Create your first shelter request to start tracking support needs.</p>
              <button type="button" className="needs-primary-btn" onClick={openAddModal}>
                <FiPlus size={18} />
                Add Need
              </button>
            </div>
          ) : (
            <div className="needs-grid">
              {needs.map((need) => (
                <article key={need.id} className="need-card">
                  <div className="need-card-head">
                    <h3>{need.title}</h3>
                    <span className={`need-status-badge ${need.status}`}>{need.status}</span>
                  </div>

                  <p className="need-description">{need.description}</p>

                  <div className="need-meta">
                    <span className="need-meta-chip">{need.category}</span>
                    <span className={`need-priority-chip ${need.priority}`}>
                      {need.priority} priority
                    </span>
                  </div>

                  <div className="need-actions">
                    <button
                      type="button"
                      className="need-edit-btn"
                      onClick={() => openEditModal(need)}
                    >
                      <FiEdit2 size={15} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="need-delete-btn"
                      onClick={() => handleDeleteNeed(need.id)}
                    >
                      <FiTrash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {isModalOpen && (
        <div className="needs-modal-overlay">
          <div className="needs-modal-card">
            <div className="needs-modal-head">
              <h3>{editingNeedId ? 'Edit Need' : 'Add New Need'}</h3>
              <button type="button" className="needs-modal-close" onClick={closeModal}>
                <FiX size={18} />
              </button>
            </div>

            <form className="needs-form" onSubmit={handleSubmit}>
              <div className="needs-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Need title"
                  required
                />
              </div>

              <div className="needs-form-group">
                <label>Description</label>
                <textarea
                  rows="4"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe the need"
                />
              </div>

              <div className="needs-form-row">
                <div className="needs-form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    placeholder="Food, Medical, Supplies..."
                  />
                </div>

                <div className="needs-form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, priority: e.target.value }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="needs-form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="open">Open</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>

              {formError && <div className="needs-form-alert">{formError}</div>}

              <div className="needs-form-actions">
                <button type="button" className="needs-secondary-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="needs-primary-btn" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingNeedId ? 'Save Changes' : 'Create Need'}
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

export default NeedsPage;
