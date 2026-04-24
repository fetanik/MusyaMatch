import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Syringe, CheckCircle2, Clock } from 'lucide-react';
import '../styles/CalendarPage.css';
import BottomNav from '../components/BottomNav';

const LOCAL_CATS_KEY = 'managerCats';

const CalendarPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { catId } = useParams();

  const catFromState = location.state?.cat || null;

  const cat = useMemo(() => {
    if (catFromState) return catFromState;

    try {
      const storedCats = JSON.parse(localStorage.getItem(LOCAL_CATS_KEY)) || [];
      return storedCats.find((item) => String(item.id) === String(catId)) || null;
    } catch {
      return null;
    }
  }, [catFromState, catId]);

  const vaccinations = useMemo(() => {
    if (!cat?.vaccinations || !Array.isArray(cat.vaccinations)) return [];

    return cat.vaccinations.map((item, index) => ({
      id: index + 1,
      name: item,
      date: 'No date added',
      status: 'Upcoming',
      type: 'Planned',
    }));
  }, [cat]);

  const upcomingCount = vaccinations.filter((item) => item.status === 'Upcoming').length;
  const doneCount = vaccinations.filter((item) => item.status === 'Completed').length;

  if (!cat) {
    return (
      <div className="calendar-wrapper">
        <header className="calendar-header">
          <button className="back-btn" onClick={() => navigate('/manager/profile')}>
            <ChevronLeft size={24} />
          </button>
          <h1>Vaccination Calendar</h1>
        </header>

        <main className="calendar-content">
          <div className="vax-list">
            <div className="vax-card upcoming">
              <div className="vax-info">
                <h3>Cat not found</h3>
                <p>Please go back and open the vaccination page from the cat card.</p>
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
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ChevronLeft size={24} />
        </button>
        <h1>Vaccination Calendar</h1>
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
          {vaccinations.map((vax) => (
            <div key={vax.id} className={`vax-card ${vax.status.toLowerCase()}`}>
              <div className="vax-icon"><Syringe size={20} /></div>
              <div className="vax-info">
                <h3>{vax.name}</h3>
                <p>{vax.date} • {vax.type}</p>
              </div>
              <div className="vax-status">
                {vax.status === "Completed" ? 
                  <CheckCircle2 color="#4CAF50" size={20} /> : 
                  <Clock color="#FFB347" size={20} />
                }
              </div>
            </div>
          ))}
        </div>

        <button className="add-vax-btn" type="button">
          + Add Reminder
        </button>
      </main>
      <BottomNav active="" />
    </div>
  );
};

export default CalendarPage;