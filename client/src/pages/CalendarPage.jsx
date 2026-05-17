import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Syringe, CheckCircle2, Clock } from 'lucide-react';
import '../styles/CalendarPage.css';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';
import { useI18n } from '../i18n/I18nContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const normalizeVaccinationNames = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
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

const CalendarPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { notify } = useMessages();
  const location = useLocation();
  const { catId } = useParams();
  const numericCatId = Number(catId);

  const [cat, setCat] = useState(location.state?.cat || null);
  const [vaccinations, setVaccinations] = useState([]);
  const [profileVaccinations, setProfileVaccinations] = useState(
    normalizeVaccinationNames(location.state?.cat?.vaccinations)
  );
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dueDate: '',
    status: 'upcoming',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  /** null = show all; click summary card to filter, click again to clear */
  const [vaxListFilter, setVaxListFilter] = useState(null);

  const isManagerRoute = location.pathname.startsWith('/manager/');
  const backFallback = isManagerRoute ? '/manager/profile' : '/dashboard';

  useEffect(() => {
    const run = async () => {
      if (!Number.isInteger(numericCatId) || numericCatId <= 0) {
        setPageError(t('cal.invalidCat'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPageError('');

        const [catRes, vaxRes] = await Promise.all([
          fetch(`${API_BASE}/api/cats/${numericCatId}`),
          fetch(`${API_BASE}/api/cats/${numericCatId}/vaccinations`),
        ]);

        if (!catRes.ok) {
          const data = await catRes.json().catch(() => ({}));
          throw new Error(data?.message || 'Failed to load cat');
        }
        if (!vaxRes.ok) {
          const data = await vaxRes.json().catch(() => ({}));
          throw new Error(data?.message || 'Failed to load vaccinations');
        }

        const catData = await catRes.json();
        setCat(catData || null);
        setProfileVaccinations(normalizeVaccinationNames(catData?.vaccinations));

        const vaxData = await vaxRes.json();
        setVaccinations(Array.isArray(vaxData) ? vaxData : []);
      } catch (e) {
        setPageError(e?.message || t('cal.errLoadPage'));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [numericCatId, t]);

  const visibleVaccinations = useMemo(() => {
    const reminderNames = new Set(
      vaccinations
        .map((item) => String(item?.name || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const fromCatProfile = profileVaccinations
      .filter((name) => !reminderNames.has(name.toLowerCase()))
      .map((name, index) => ({
        id: `profile-${name}-${index}`,
        name,
        dueDate: null,
        status: 'completed',
        source: 'profile',
      }));

    return [...vaccinations, ...fromCatProfile];
  }, [vaccinations, profileVaccinations]);

  const upcomingCount = useMemo(
    () => visibleVaccinations.filter((item) => item.status === 'upcoming').length,
    [visibleVaccinations]
  );
  const doneCount = useMemo(
    () => visibleVaccinations.filter((item) => item.status === 'completed').length,
    [visibleVaccinations]
  );

  const filteredVaccinations = useMemo(() => {
    if (!vaxListFilter) return visibleVaccinations;
    return visibleVaccinations.filter((item) => item.status === vaxListFilter);
  }, [visibleVaccinations, vaxListFilter]);

  const closeModal = () => {
    setIsModalOpen(false);
    setForm({ name: '', dueDate: '', status: 'upcoming', notes: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/cats/${numericCatId}/vaccinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          dueDate: form.dueDate || null,
          status: form.status,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to add vaccination');
      }

      setVaccinations((prev) => [data, ...prev]);
      closeModal();
    } catch (e2) {
      console.error(e2);
      await notify(t('cal.errAdd'), { type: 'error', title: t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="calendar-wrapper">
        <header className="calendar-header">
          <button className="back-btn" onClick={() => navigate(backFallback)}>
            <ChevronLeft size={24} />
          </button>
          <h1>{t('cal.title')}</h1>
        </header>

        <main className="calendar-content">
          <div className="vax-list">
            <div className="vax-card upcoming">
              <div className="vax-info">
                <h3>{t('cal.loadingTitle')}</h3>
                <p>{t('cal.loadingHint')}</p>
              </div>
            </div>
          </div>
        </main>
        <BottomNav active="" />
      </div>
    );
  }

  if (pageError || !cat) {
    return (
      <div className="calendar-wrapper">
        <header className="calendar-header">
          <button className="back-btn" onClick={() => navigate(backFallback)}>
            <ChevronLeft size={24} />
          </button>
          <h1>{t('cal.title')}</h1>
        </header>

        <main className="calendar-content">
          <div className="vax-list">
            <div className="vax-card upcoming">
              <div className="vax-info">
                <h3>{t('cal.catNotFound')}</h3>
                <p>
                  {pageError || t('cal.catNotFoundHint')}
                </p>
                <p style={{ marginTop: 6, fontSize: 12, color: '#636E72' }}>
                  {t('cal.catId')}: {String(catId)}
                </p>
              </div>
            </div>
          </div>
        </main>
        <BottomNav active="" />
      </div>
    );
  }

  return (
    <div className="calendar-wrapper">
      <header className="calendar-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1>{cat?.name ? t('cal.titleWithName', { name: cat.name }) : t('cal.title')}</h1>
      </header>

      <main className="calendar-content">
        <div className="status-summary">
          <button
            type="button"
            className={`summary-card${vaxListFilter === 'upcoming' ? ' summary-card--active' : ''}`}
            onClick={() => setVaxListFilter((f) => (f === 'upcoming' ? null : 'upcoming'))}
            aria-pressed={vaxListFilter === 'upcoming'}
            aria-label={t('cal.filterUpcomingAria')}
          >
            <span className="count">{upcomingCount}</span>
            <span className="label">{t('cal.upcoming')}</span>
          </button>
          <button
            type="button"
            className={`summary-card completed${vaxListFilter === 'completed' ? ' summary-card--active' : ''}`}
            onClick={() => setVaxListFilter((f) => (f === 'completed' ? null : 'completed'))}
            aria-pressed={vaxListFilter === 'completed'}
            aria-label={t('cal.filterDoneAria')}
          >
            <span className="count">{doneCount}</span>
            <span className="label">{t('cal.done')}</span>
          </button>
        </div>

        <div className="vax-list">
          {visibleVaccinations.length === 0 ? (
            <div className="vax-card upcoming">
              <div className="vax-info">
                <h3>{t('cal.noReminders')}</h3>
                <p>{t('cal.noRemindersHint')}</p>
              </div>
            </div>
          ) : filteredVaccinations.length === 0 ? (
            <div className="vax-card upcoming">
              <div className="vax-info">
                <h3>{t('cal.noItemsView')}</h3>
                <p>
                  {vaxListFilter === 'upcoming'
                    ? t('cal.noUpcomingList')
                    : t('cal.noCompletedList')}
                </p>
                <p className="vax-filter-hint">{t('cal.filterHint')}</p>
              </div>
            </div>
          ) : filteredVaccinations.map((vax) => (
            <div key={vax.id} className={`vax-card ${vax.status}`}>
              <div className="vax-icon"><Syringe size={20} /></div>
              <div className="vax-info">
                <h3>{vax.name}</h3>
                <p>
                  {vax.dueDate || t('cal.noDate')} • {vax.source === 'profile' ? t('cal.fromProfile') : t('cal.reminder')}
                </p>
              </div>
              <div className="vax-status">
                {vax.status === "completed" ? 
                  <CheckCircle2 color="#4CAF50" size={20} /> : 
                  <Clock color="#FFB347" size={20} />
                }
              </div>
            </div>
          ))}
        </div>

        <button className="add-vax-btn" type="button" onClick={() => setIsModalOpen(true)}>
          {t('cal.addReminder')}
        </button>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{t('cal.modalTitle')}</h3>
              <button type="button" className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="cat-form" onSubmit={handleCreate}>
              <div className="form-group">
                <label>{t('cal.vaccineName')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('cal.phVaccine')}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>{t('cal.dueDate')}</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>{t('cal.status')}</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="upcoming">{t('cal.statusUpcoming')}</option>
                    <option value="completed">{t('cal.statusCompleted')}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('cal.notes')}</label>
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={t('cal.phNotes')}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? t('cal.saving') : t('cal.addReminderBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <BottomNav active="" />
    </div>
  );
};

export default CalendarPage;