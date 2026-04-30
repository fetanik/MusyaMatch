import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage'; 
import RegistrationPage from './pages/RegistrationPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage'; 
import DashboardPage from './pages/DashboardPage'; 
import ManagerProfile from './pages/ManagerProfile';
import ManagerSettingsPage from './pages/ManagerSettingsPage';
import NeedsPage from './pages/NeedsPage';
import Gallery from './pages/Gallery';
import PharmaciesPage from './pages/PharmaciesPage';

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

function App() {
  const currentUser = getCurrentUser();
  const isAuthenticated = Boolean(currentUser);
  const isManager = currentUser?.role === 'manager';

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route
            path="/manager"
            element={isAuthenticated && isManager ? <Navigate to="/manager/profile" replace /> : <Navigate to="/register" replace />}
          />
          <Route
            path="/manager/profile"
            element={isAuthenticated && isManager ? <ManagerProfile /> : <Navigate to="/register" replace />}
          />
          <Route
            path="/manager/settings"
            element={isAuthenticated && isManager ? <ManagerSettingsPage /> : <Navigate to="/register" replace />}
          />
          <Route
            path="/manager/needs"
            element={isAuthenticated && isManager ? <NeedsPage /> : <Navigate to="/register" replace />}
          />
          <Route
            path="/manager/cats/:catId/vaccinations"
            element={isAuthenticated && isManager ? <CalendarPage /> : <Navigate to="/register" replace />}
          />
          <Route
            path="/profile"
            element={isAuthenticated && !isManager ? <ProfilePage /> : <Navigate to="/register" replace />}
          />
          <Route
            path="/dashboard"
            element={isAuthenticated && !isManager ? <DashboardPage /> : <Navigate to="/register" replace />}
          />
          <Route path="/pharmacies" element={<PharmaciesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;