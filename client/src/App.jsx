import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage'; // Твоя стартова сторінка (не чіпаємо)
import RegistrationPage from './pages/RegistrationPage';
import ProfilePage from './pages/ProfilePage'; // Сторінка налаштувань
import DashboardPage from './pages/DashboardPage'; 

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} /> 
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;