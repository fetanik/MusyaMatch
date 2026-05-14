import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, CreditCard, Info } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import '../styles/DashboardPage.css'; // Використовуємо існуючі стилі, або створіть EventsPage.css

const EVENTS_API = `${import.meta.env.VITE_API_BASE_URL || ''}/api/events`;

const EventsPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        
        // Відфільтровуємо лише активні події для користувачів
        const activeEvents = data.filter(event => event.status === 'active');
        setEvents(activeEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Не вдалося завантажити події. Спробуйте пізніше.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Функція для форматування дати
  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не вказана';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('uk-UA', options);
  };

  return (
    <div className="profile-page"> {/* Використовуємо існуючий контейнер для збереження стилістики */}
      <div className="profile-header-bg" style={{ paddingBottom: '20px' }}>
        <header className="profile-header">
          <div className="user-info">
            <button 
              className="back-btn" 
              onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginRight: '10px' }}
            >
              <ArrowLeft size={24} />
            </button>
            <div className="text-info">
              <h1>Community Events</h1>
              <p>Зустрічі, виставки та волонтерство</p>
            </div>
          </div>
        </header>
      </div>

      <div className="profile-content">
        {loading ? (
          <div className="empty-card">
            <p>Завантаження подій...</p>
          </div>
        ) : error ? (
          <div className="empty-card">
            <p style={{ color: 'red' }}>{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-card">
            <Calendar size={48} color="#ccc" style={{ marginBottom: '10px' }} />
            <p>Поки що немає запланованих подій. Слідкуйте за оновленнями!</p>
          </div>
        ) : (
          <div className="cats-grid"> {/* Використовуємо грід з котів, він чудово підійде для карток */}
            {events.map((event) => (
              <article key={event.id} className="cat-card">
                {event.image_url ? (
                  <img
                    src={event.image_url}
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
                  <div style={{ 
                    width: '100%', 
                    height: '200px', 
                    backgroundColor: '#f0f0f0', 
                    borderRadius: '16px', 
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar size={40} color="#aaa" />
                  </div>
                )}

                <div className="cat-card-head" style={{ marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{event.title}</h3>
                  </div>
                </div>

                <div className="cat-meta" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={16} /> {formatDate(event.date)}
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
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #eee' }}>
                    <p style={{ fontSize: '14px', color: '#555', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      {event.description}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
};

export default EventsPage;