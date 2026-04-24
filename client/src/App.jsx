import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage'; 
import RegistrationPage from './pages/RegistrationPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage'; 
import DashboardPage from './pages/DashboardPage'; 
import Gallery from './pages/Gallery';
import PharmaciesPage from './pages/PharmaciesPage';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<RegistrationPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} /> 
          <Route path="/pharmacies" element={<PharmaciesPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;