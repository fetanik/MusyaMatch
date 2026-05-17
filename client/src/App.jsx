import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage'; 
import RegistrationPage from './pages/RegistrationPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage'; 
import DashboardPage from './pages/DashboardPage'; 
import ManagerProfile from './pages/ManagerProfile';
import ManagerSettingsPage from './pages/ManagerSettingsPage';
import ManagerRequestsPage from './pages/ManagerRequestsPage';
import NeedsPage from './pages/NeedsPage';
import Gallery from './pages/Gallery.jsx';
import PharmaciesPage from './pages/PharmaciesPage';
import ChatPage from './pages/ChatPage';
import AchievementsPage from './pages/AchievementsPage';
import ShelterNeedsPage from './pages/ShelterNeedsPage';
import MarketplacePage from './pages/MarketplacePage';
import EventsPage from './pages/EventsPage';
import MessagesProvider from './components/MessagesProvider';
import { isLoggedInClient, isShelterManagerClient } from './utils/clientSession';
import { useI18n } from './i18n/I18nContext';

/** Reads session on each render so login/register works (App does not re-render on route-only updates). */
function RequireAuth({ children }) {
  return isLoggedInClient() ? children : <Navigate to="/register" replace />;
}

function MarketplaceGate() {
  if (!isLoggedInClient()) return <Navigate to="/register" replace />;
  if (isShelterManagerClient()) return <Navigate to="/manager-profile" replace />;
  return <MarketplacePage />;
}

function App() {
  const { locale } = useI18n();

  return (
    <MessagesProvider>
      <BrowserRouter>
        <div className="App">
          <Routes key={locale}>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/marketplace" element={<MarketplaceGate />} />
            <Route path="/shelter-needs" element={<ShelterNeedsPage />} />
            <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
            <Route path="/manager" element={<Navigate to="/manager/profile" replace />} />
            <Route path="/manager/profile" element={<Navigate to="/manager-profile" replace />} />
            <Route path="/manager-profile" element={<ManagerProfile />} />
            <Route path="/manager/requests" element={<ManagerRequestsPage />} />
            <Route path="/manager/needs" element={<NeedsPage />} />
            <Route path="/manager/settings" element={<ManagerSettingsPage />} />
            <Route path="/manager/cats/:catId/vaccinations" element={<CalendarPage />} />
            <Route path="/cats/:catId/vaccinations" element={<CalendarPage />} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/events" element={<RequireAuth><EventsPage /></RequireAuth>} />
            <Route path="/pharmacies" element={<PharmaciesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </MessagesProvider>
  );
}

export default App;