import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/RegistrationPage.css';
import { Sparkles, AlertCircle, Home, Cat, Eye, EyeOff } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/auth`;

const RegistrationPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetFormState = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleTabSwitch = (mode) => {
    setIsLogin(mode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);

    if (!mode) {
      setRole('user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!normalizedEmail || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isLogin && !trimmedName) {
      setError(role === 'manager' ? 'Please enter shelter name' : 'Please enter your full name');
      return;
    }

    if (!isLogin && password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.message || 'Incorrect email or password');
        }

        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('musyamatch_is_registered', 'true');
        localStorage.setItem('userId', String(result.user?.userId || result.user?.id || ''));
        localStorage.setItem('userRole', result.user?.role || '');
        localStorage.setItem('userName', result.user?.name || '');
        localStorage.setItem('userEmail', result.user?.email || '');

        if (result.user.role === 'manager') {
          navigate('/manager/profile', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }

        return;
      }

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          name: trimmedName,
          email: normalizedEmail,
          password,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Registration failed');
      }

      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('musyamatch_is_registered', 'true');
      localStorage.setItem('userId', String(result.user?.userId || result.user?.id || ''));
      localStorage.setItem('userRole', result.user?.role || '');
      localStorage.setItem('userName', result.user?.name || '');
      localStorage.setItem('userEmail', result.user?.email || '');
      resetFormState();

      if (result.user.role === 'manager') {
        navigate('/manager/profile', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
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
            type="button"
          >
            Log In
          </button>
          <button
            className={`tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => handleTabSwitch(false)}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div
            style={{
              color: '#e74c3c',
              backgroundColor: '#fadbd8',
              padding: '12px',
              borderRadius: '15px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
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
                    <span>Shelter manager</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {!isLogin && role === 'user' && (
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  placeholder="What's your full name?"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          {!isLogin && role === 'manager' && (
            <div className="input-group">
              <label>Shelter Name</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  placeholder="Enter shelter name"
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
              <input
                className="has-right-icon"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="input-with-icon">
                <input
                  className="has-right-icon"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isLogin ? 'Log In' : 'Sign Up'}
            {!isLogin && !isSubmitting && <Sparkles size={18} style={{ marginLeft: '8px' }} />}
          </button>
        </form>
      </div>
      <BottomNav active="" />
    </div>
  );
};

export default RegistrationPage;