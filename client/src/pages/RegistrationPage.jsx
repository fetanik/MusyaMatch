import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/RegistrationPage.css';
import { Mail, Lock, User, Sparkles, AlertCircle, Home, Cat } from 'lucide-react';

const RegistrationPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const [role, setRole] = useState('user');

  const handleTabSwitch = (mode) => {
    setIsLogin(mode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setRole('user');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    navigate('/profile'); 
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Welcome Back!' : 'Create an Account'}</h2>
          <p>{isLogin ? 'Log in to find your purrfect match 🐱' : 'Join MusyaMatch ✨'}</p>
        </div>

        <div className="tab-switcher">
          <button 
            className={`tab-btn ${isLogin ? 'active' : ''}`} 
            onClick={() => handleTabSwitch(true)}
          >
            Log In
          </button>
          <button 
            className={`tab-btn ${!isLogin ? 'active' : ''}`} 
            onClick={() => handleTabSwitch(false)}
          >
            Sign Up
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
              <label>Who are you?</label>
              <div className="role-selector">
                <label className={`role-option ${role === 'user' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="role" 
                    value="user" 
                    checked={role === 'user'}
                    onChange={(e) => setRole(e.target.value)} 
                  />
                  <div className="role-content">
                    <Cat size={24} />
                    <span>Looking for a cat</span>
                  </div>
                </label>
                
                <label className={`role-option ${role === 'manager' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="role" 
                    value="manager" 
                    checked={role === 'manager'}
                    onChange={(e) => setRole(e.target.value)} 
                  />
                  <div className="role-content">
                    <Home size={24} />
                    <span>Shelter</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="input-group">
              <label>Full Name {role === 'manager' && '(or Shelter Name)'}</label>
              <div className="input-with-icon">
                <User size={20} className="input-icon" />
                <input 
                  type="text" 
                  placeholder={role === 'user' ? "What's your name?" : "Your shelter's name"} 
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
                placeholder="Enter your email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={20} className="input-icon" />
              <input 
                type="password" 
                placeholder="Enter your password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={20} className="input-icon" />
                <input 
                  type="password" 
                  placeholder="Confirm your password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-submit">
            {isLogin ? 'Log In' : 'Sign Up'}
            {!isLogin && <Sparkles size={18} style={{marginLeft: '8px'}}/>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;