import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage'; 
import RegistrationPage from './pages/RegistrationPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage'; 
import DashboardPage from './pages/DashboardPage'; 
import ManagerProfile from './pages/ManagerProfile';
import ManagerSettingsPage from './pages/ManagerSettingsPage';
import Gallery from './pages/Gallery';
import PharmaciesPage from './pages/PharmaciesPage';
import CalendarPage from './pages/CalendarPage';

const getIsRegistered = () => localStorage.getItem('musyamatch_is_registered') === 'true';

function App() {
  const isRegistered = getIsRegistered();

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={isRegistered ? '/dashboard' : '/home'} replace />}
          />
          <Route path="/home" element={<HomePage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/manager" element={<Navigate to="/manager/profile" replace />} />
          <Route path="/manager/profile" element={<ManagerProfile />} />
          <Route path="/manager/settings" element={<ManagerSettingsPage />} />
          <Route path="/manager/cats/:catId/vaccinations" element={<CalendarPage />} />
          <Route
            path="/profile"
            element={isRegistered ? <ProfilePage /> : <Navigate to="/register" replace />}
          />
          <Route
            path="/dashboard"
            element={isRegistered ? <DashboardPage /> : <Navigate to="/register" replace />}
          />
          <Route path="/pharmacies" element={<PharmaciesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;