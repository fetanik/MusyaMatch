import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage'; 
import RegistrationPage from './pages/RegistrationPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage'; 
import DashboardPage from './pages/DashboardPage'; 
import ManagerProfile from './pages/ManagerProfile';
import ManagerSettingsPage from './pages/ManagerSettingsPage';
import Gallery from './pages/Gallery';
import PharmaciesPage from './pages/PharmaciesPage';
import AchievementsPage from './pages/AchievementsPage';
import ShelterNeedsPage from './pages/ShelterNeedsPage';
import MarketplacePage from './pages/MarketplacePage';
import MessagesProvider from './components/MessagesProvider';

const getIsRegistered = () => localStorage.getItem('musyamatch_is_registered') === 'true';

function ChatComingSoon() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginTop: 0 }}>Musya AI</h1>
      <p>Chat is not available in this build yet.</p>
      <button type="button" onClick={() => navigate('/home')}>
        Back to home
      </button>
    </div>
  );
}

function App() {
  const isRegistered = getIsRegistered();

  return (
    <MessagesProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            {/* Головна з логікою редіректу */}
            <Route
              path="/"
              element={<Navigate to={isRegistered ? '/dashboard' : '/home'} replace />}
            />
            <Route path="/home" element={<HomePage />} />
            <Route path="/register" element={<RegistrationPage />} />
            
            {/* Твої фічі: Календар, Галерея, Ачівки */}
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            
            {/* НОВІ РОУТИ: Маркетплейс та Потреби */}
            <Route path="/shelter-needs" element={<ShelterNeedsPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />

            {/* Менеджерська частина */}
            <Route path="/manager" element={<Navigate to="/manager/profile" replace />} />
            <Route path="/manager/profile" element={<ManagerProfile />} />
            <Route path="/manager/settings" element={<ManagerSettingsPage />} />
            <Route path="/manager/cats/:catId/vaccinations" element={<CalendarPage />} />
            
            {/* Клієнтська частина */}
            <Route path="/cats/:catId/vaccinations" element={<CalendarPage />} />
            <Route
              path="/profile"
              element={isRegistered ? <ProfilePage /> : <Navigate to="/register" replace />}
            />
            <Route
              path="/dashboard"
              element={isRegistered ? <DashboardPage /> : <Navigate to="/register" replace />}
            />
            
            <Route path="/pharmacies" element={<PharmaciesPage />} />
            <Route path="/chat" element={<ChatComingSoon />} />

            {/* Редірект для всіх інших посилань */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </MessagesProvider>
  );
}

export default App;