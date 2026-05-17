import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiClipboard, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';
import '../styles/NeedsPage.css';
import { useI18n } from '../i18n/I18nContext';

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

const todayYmdLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatNeedDueDisplay = (ymd) => {
  if (!ymd) return '';
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return String(ymd);
  }
};

const emptyForm = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  status: 'open',
  dueDate: '',
};

const NeedsPage = () => {
  const navigate = useNavigate();
  const { notify, confirm } = useMessages();
  const { t } = useI18n();
  const [needs, setNeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNeedId, setEditingNeedId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const minOpenDueDate = useMemo(() => todayYmdLocal(), []);

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
      setLoadError(t('needMgr.loadFail'));
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
      dueDate: need.dueDate || need.due_date || '',
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
    const confirmed = await confirm(t('needMgr.delConfirm'), {
      type: 'confirm',
      title: t('needMgr.delTitle'),
      confirmText: t('needMgr.delYes'),
      cancelText: t('needMgr.cancel'),
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
      await notify(t('needMgr.errDelete'), { type: 'error', title: t('common.error') });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = formData.title.trim();

    if (!trimmedTitle) {
      setFormError(t('needMgr.errTitleReq'));
      return;
    }

    const dueTrim = (formData.dueDate || '').trim();
    if (!editingNeedId && !dueTrim) {
      setFormError(t('needMgr.errDue'));
      return;
    }
    if (editingNeedId && formData.status === 'open' && !dueTrim) {
      setFormError(t('needMgr.errDueOpen'));
      return;
    }

    const { userId, shelterId } = getCurrentUser();
    if (!userId && !shelterId) {
      setFormError(t('needMgr.errLogin'));
      await notify(t('needMgr.errProfile'), {
        type: 'error',
        title: t('needMgr.profileTitle'),
      });
      return;
    }
    const payload = {
      title: trimmedTitle,
      description: formData.description.trim(),
      category: formData.category.trim() || t('needMgr.catGeneral'),
      priority: formData.priority,
      status: formData.status,
      userId,
      shelterId,
    };

    if (dueTrim) {
      payload.dueDate = dueTrim;
    }

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
      setFormError(error.message || t('needMgr.errSave'));
      await notify(t('needMgr.errSave'), { type: 'error', title: t('common.error') });
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
            aria-label={t('needMgr.backAria')}
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="needs-title-wrap">
            <h1>{t('needMgr.title')}</h1>
            <p>{t('needMgr.subtitle')}</p>
            <p className="needs-page-hint">{t('needMgr.hint')}</p>
          </div>
        </div>
      </header>

      <main className="needs-content">
        <section className="needs-summary-card">
          <div className="needs-summary-icon">
            <FiClipboard size={20} />
          </div>

          <div className="needs-summary-text">
            <h2>{t('needMgr.summaryTitle')}</h2>
            <p>{t('needMgr.summarySub', { n: openNeedsCount })}</p>
          </div>

          <button type="button" className="needs-primary-btn" onClick={openAddModal}>
            <FiPlus size={18} />
            {t('needMgr.addNeed')}
          </button>
        </section>

        <section className="needs-section">
          <div className="needs-section-head">
            <h2>{t('needMgr.listTitle')}</h2>
            <span className="needs-count">{needs.length}</span>
          </div>

          {isLoading ? (
            <div className="needs-empty-card">
              <h3>{t('needMgr.loading')}</h3>
            </div>
          ) : loadError ? (
            <div className="needs-empty-card">
              <h3>{t('needMgr.errTitle')}</h3>
              <p>{loadError}</p>
              <button type="button" className="needs-primary-btn" onClick={loadNeeds}>
                {t('needMgr.tryAgain')}
              </button>
            </div>
          ) : needs.length === 0 ? (
            <div className="needs-empty-card">
              <h3>{t('needMgr.noNeeds')}</h3>
              <p>{t('needMgr.noNeedsSub')}</p>
              <button type="button" className="needs-primary-btn" onClick={openAddModal}>
                <FiPlus size={18} />
                {t('needMgr.addNeed')}
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
                      {need.priority} {t('needMgr.prioritySuffix')}
                    </span>
                    {(need.dueDate || need.due_date) && (
                      <span className="need-due-chip">
                        {t('needMgr.due')} {formatNeedDueDisplay(need.dueDate || need.due_date)}
                      </span>
                    )}
                  </div>

                  <div className="need-actions">
                    <button
                      type="button"
                      className="need-edit-btn"
                      onClick={() => openEditModal(need)}
                    >
                      <FiEdit2 size={15} />
                      {t('needMgr.edit')}
                    </button>
                    <button
                      type="button"
                      className="need-delete-btn"
                      onClick={() => handleDeleteNeed(need.id)}
                    >
                      <FiTrash2 size={15} />
                      {t('needMgr.delete')}
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
              <h3>{editingNeedId ? t('needMgr.modalEdit') : t('needMgr.modalAdd')}</h3>
              <button type="button" className="needs-modal-close" onClick={closeModal}>
                <FiX size={18} />
              </button>
            </div>

            <form className="needs-form" onSubmit={handleSubmit}>
              <div className="needs-form-group">
                <label>{t('needMgr.labelTitle')}</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t('needMgr.phTitle')}
                  required
                />
              </div>

              <div className="needs-form-group">
                <label>{t('needMgr.labelDesc')}</label>
                <textarea
                  rows="4"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t('needMgr.phDesc')}
                />
              </div>

              <div className="needs-form-row">
                <div className="needs-form-group">
                  <label>{t('needMgr.labelCat')}</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    placeholder={t('needMgr.phCategory')}
                  />
                </div>

                <div className="needs-form-group">
                  <label>{t('needMgr.labelPri')}</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, priority: e.target.value }))
                    }
                  >
                    <option value="low">{t('needMgr.optLow')}</option>
                    <option value="medium">{t('needMgr.optMed')}</option>
                    <option value="high">{t('needMgr.optHigh')}</option>
                  </select>
                </div>
              </div>

              <div className="needs-form-group">
                <label>{t('needMgr.labelDue')}</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  min={formData.status === 'open' ? minOpenDueDate : undefined}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
                <span className="needs-field-hint">
                  {formData.status === 'open' ? t('needMgr.dueHintOpen') : t('needMgr.dueHintFulfilled')}
                </span>
              </div>

              <div className="needs-form-group">
                <label>{t('needMgr.labelStat')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="open">{t('needMgr.optOpen')}</option>
                  <option value="fulfilled">{t('needMgr.optFulfilled')}</option>
                </select>
              </div>

              {formError && <div className="needs-form-alert">{formError}</div>}

              <div className="needs-form-actions">
                <button type="button" className="needs-secondary-btn" onClick={closeModal}>
                  {t('needMgr.cancel')}
                </button>
                <button type="submit" className="needs-primary-btn" disabled={isSaving}>
                  {isSaving
                    ? t('needMgr.saving')
                    : editingNeedId
                      ? t('needMgr.saveChanges')
                      : t('needMgr.createNeed')}
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
