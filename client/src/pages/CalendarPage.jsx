import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Syringe, CheckCircle2, Clock } from 'lucide-react';
import '../styles/CalendarPage.css';
import BottomNav from '../components/BottomNav';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const CalendarPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { catId } = useParams();
  const numericCatId = Number(catId);

  const [cat, setCat] = useState(location.state?.cat || null);
  const [vaccinations, setVaccinations] = useState([]);
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

  const isManagerRoute = location.pathname.startsWith('/manager/');
  const backFallback = isManagerRoute ? '/manager/profile' : '/dashboard';

  useEffect(() => {
    const run = async () => {
      if (!Number.isInteger(numericCatId) || numericCatId <= 0) {
        setPageError('Invalid cat id.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPageError('');

        const [catRes, vaxRes] = await Promise.all([
          cat ? Promise.resolve(null) : fetch(`${API_BASE}/api/cats/${numericCatId}`),
          fetch(`${API_BASE}/api/cats/${numericCatId}/vaccinations`),
        ]);

        if (catRes && !catRes.ok) {
          const data = await catRes.json().catch(() => ({}));
          throw new Error(data?.message || 'Failed to load cat');
        }
        if (!vaxRes.ok) {
          const data = await vaxRes.json().catch(() => ({}));
          throw new Error(data?.message || 'Failed to load vaccinations');
        }

        if (catRes) {
          const catData = await catRes.json();
          setCat(catData || null);
        }

        const vaxData = await vaxRes.json();
        setVaccinations(Array.isArray(vaxData) ? vaxData : []);
      } catch (e) {
        setPageError(e?.message || 'Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericCatId]);

  const upcomingCount = useMemo(
    () => vaccinations.filter((item) => item.status === 'upcoming').length,
    [vaccinations]
  );
  const doneCount = useMemo(
    () => vaccinations.filter((item) => item.status === 'completed').length,
    [vaccinations]
  );

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
      alert(e2?.message || 'Failed to add vaccination');
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
          <h1>Vaccination Calendar</h1>
        </header>

        <main className="calendar-content">
          <div className="vax-list">
            <div className="vax-card upcoming">
              <div className="vax-info">
                <h3>Loading…</h3>
                <p>Please wait.</p>
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
          <h1>Vaccination Calendar</h1>
        </header>

        <main className="calendar-content">
          <div className="vax-list">
            <div className="vax-card upcoming">
              <div className="vax-info">
                <h3>Cat not found</h3>
                <p>
                  {pageError ||
                    'Please go back and open the vaccination page from the cat card.'}
                </p>
                <p style={{ marginTop: 6, fontSize: 12, color: '#636E72' }}>
                  Cat ID: {String(catId)}
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
        <h1>{cat?.name ? `${cat.name} vaccinations` : 'Vaccination Calendar'}</h1>
      </header>

      <main className="calendar-content">
        <div className="status-summary">
          <div className="summary-card">
            <span className="count">{upcomingCount}</span>
            <span className="label">Upcoming</span>
          </div>
          <div className="summary-card completed">
            <span className="count">{doneCount}</span>
            <span className="label">Done</span>
          </div>
        </div>

        <div className="vax-list">
          {vaccinations.length === 0 ? (
            <div className="vax-card upcoming">
              <div className="vax-info">
                <h3>No reminders yet</h3>
                <p>Add the first vaccination reminder for this cat.</p>
              </div>
            </div>
          ) : vaccinations.map((vax) => (
            <div key={vax.id} className={`vax-card ${vax.status}`}>
              <div className="vax-icon"><Syringe size={20} /></div>
              <div className="vax-info">
                <h3>{vax.name}</h3>
                <p>{vax.dueDate || 'No date'} • Reminder</p>
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
          + Add Reminder
        </button>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Add vaccine reminder</h3>
              <button type="button" className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="cat-form" onSubmit={handleCreate}>
              <div className="form-group">
                <label>Vaccine name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Example: Rabies"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Due date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Anything important…"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving…' : 'Add reminder'}
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