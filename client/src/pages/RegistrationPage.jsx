import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/RegistrationPage.css';
import { Mail, Lock, User, Sparkles, AlertCircle } from 'lucide-react';

const RegistrationPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleTabSwitch = (mode) => {
    setIsLogin(mode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Пароль має містити щонайменше 8 символів');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Паролі не збігаються');
      return;
    }

    console.log(isLogin ? 'Авторизація успішна' : 'Реєстрація успішна');
    navigate('/home'); 
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'З поверненням!' : 'Створити акаунт'}</h2>
          <p>{isLogin ? 'Увійдіть, щоб знайти свого котика 🐱' : 'Приєднуйтесь до MusyaMatch ✨'}</p>
        </div>

        <div className="tab-switcher">
          <button 
            className={`tab-btn ${isLogin ? 'active' : ''}`} 
            onClick={() => handleTabSwitch(true)}
          >
            Увійти
          </button>
          <button 
            className={`tab-btn ${!isLogin ? 'active' : ''}`} 
            onClick={() => handleTabSwitch(false)}
          >
            Реєстрація
          </button>
        </div>

        {error && (
          <div style={{ color: '#e74c3c', backgroundColor: '#fadbd8', padding: '12px', borderRadius: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label>Ваше ім'я</label>
              <div className="input-with-icon">
                <User size={20} className="input-icon" />
                <input 
                  type="text" 
                  placeholder="Як вас звати?" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <div className="input-with-icon">
              <Mail size={20} className="input-icon" />
              <input 
                type="email" 
                placeholder="Введіть ваш email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Пароль</label>
            <div className="input-with-icon">
              <Lock size={20} className="input-icon" />
              <input 
                type="password" 
                placeholder="Введіть пароль" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>Повторіть пароль</label>
              <div className="input-with-icon">
                <Lock size={20} className="input-icon" />
                <input 
                  type="password" 
                  placeholder="Повторіть пароль" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-submit">
            {isLogin ? 'Увійти' : 'Зареєструватися'}
            {!isLogin && <Sparkles size={18} style={{marginLeft: '8px'}}/>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;