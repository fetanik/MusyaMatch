import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Syringe, CheckCircle2, Clock } from 'lucide-react';
import '../styles/CalendarPage.css';

const CalendarPage = () => {
  const navigate = useNavigate();

  
  const vaccinations = [
    { id: 1, name: "Rabies Vaccine", date: "2026-05-15", status: "Upcoming", type: "Core" },
    { id: 2, name: "FVRCP (Distemper)", date: "2026-06-10", status: "Upcoming", type: "Core" },
    { id: 3, name: "FeLV (Leukemia)", date: "2026-03-01", status: "Completed", type: "Non-core" },
  ];

  return (
    <div className="calendar-wrapper">
      <header className="calendar-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={24} />
        </button>
        <h1>Vaccination Calendar</h1>
      </header>

      <main className="calendar-content">
        <div className="status-summary">
          <div className="summary-card">
            <span className="count">2</span>
            <span className="label">Upcoming</span>
          </div>
          <div className="summary-card completed">
            <span className="count">1</span>
            <span className="label">Done</span>
          </div>
        </div>

        <div className="vax-list">
          {vaccinations.map((vax) => (
            <div key={vax.id} className={`vax-card ${vax.status.toLowerCase()}`}>
              <div className="vax-icon">
                <Syringe size={20} />
              </div>
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

        <button className="add-vax-btn">+ Add Reminder</button>
      </main>
    </div>
  );
};

export default CalendarPage;