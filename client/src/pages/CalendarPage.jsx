import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Syringe, CheckCircle2, Clock, X } from 'lucide-react';
import '../styles/CalendarPage.css';

const CalendarPage = () => {
  const navigate = useNavigate();
  
  
  const [vaccinations, setVaccinations] = useState([
    { id: 1, name: "Rabies Vaccine", date: "2026-05-15", status: "Upcoming", type: "Core" },
    { id: 2, name: "FVRCP (Distemper)", date: "2026-06-10", status: "Upcoming", type: "Core" },
    { id: 3, name: "FeLV (Leukemia)", date: "2026-03-01", status: "Completed", type: "Non-core" },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVax, setNewVax] = useState({ name: '', date: '', type: 'Core' });

  
  const upcomingCount = vaccinations.filter(v => v.status === "Upcoming").length;
  const doneCount = vaccinations.filter(v => v.status === "Completed").length;

  const handleAddReminder = (e) => {
    e.preventDefault();
    const vaxToAdd = {
      id: Date.now(),
      ...newVax,
      status: "Upcoming"
    };
    
    setVaccinations([...vaccinations, vaxToAdd]);
    setIsModalOpen(false);
    
    
    alert("Success! +150 Purr-Points earned for health tracking! 🐾");
    
  };

  return (
    <div className="calendar-wrapper">
      <header className="calendar-header">
        <button className="back-btn" onClick={() => navigate('/home')}>
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

        <button className="add-vax-btn" onClick={() => setIsModalOpen(true)}>
          + Add Reminder
        </button>
      </main>


      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>New Reminder</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddReminder}>
              <div className="form-group">
                <label>Vaccine Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rabies" 
                  required 
                  onChange={(e) => setNewVax({...newVax, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  required 
                  onChange={(e) => setNewVax({...newVax, date: e.target.value})}
                />
              </div>
              <button type="submit" className="save-vax-btn">Save & Earn Points</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;