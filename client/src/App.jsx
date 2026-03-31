import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import Gallery from './pages/Gallery';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
              <Route path="/" element={<RegistrationPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;