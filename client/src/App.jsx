import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* Твоя сторінка тепер відкривається першою (за замовчуванням) */}
          <Route path="/" element={<RegistrationPage />} />
          
          {/* Сторінку Олесі ми тимчасово перемістили сюди, щоб не зламати її роботу */}
          <Route path="/home" element={<HomePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;