import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
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
          <Route path="/pharmacies" element={<PharmaciesPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;