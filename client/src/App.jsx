import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import ProfilePage from './pages/ProfilePage';
import ManagerProfile from './pages/ManagerProfile';
import ManagerSettingsPage from './pages/ManagerSettingsPage';
import DashboardPage from './pages/DashboardPage';
import Gallery from './pages/Gallery';
import PharmaciesPage from './pages/PharmaciesPage';
import CalendarPage from './pages/CalendarPage';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route path="/manager" element={<Navigate to="/manager/profile" replace />} />
          <Route path="/manager/profile" element={<ManagerProfile />} />
          <Route path="/manager/settings" element={<ManagerSettingsPage />} />
          <Route path="/manager/cats/:catId/vaccinations" element={<CalendarPage />} />

          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pharmacies" element={<PharmaciesPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;