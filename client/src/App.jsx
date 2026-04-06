import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import ProfilePage from './pages/ProfilePage';
import ManagerProfile from './pages/ManagerProfile';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/manager/profile" element={<ManagerProfile />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;