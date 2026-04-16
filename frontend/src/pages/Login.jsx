import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email: formData.email, password: formData.password });
        login(res.data);
      } else {
        const res = await api.post('/auth/signup', formData);
        login(res.data);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <Activity size={40} color="var(--primary)" />
        <h1 style={{ marginLeft: '10px', fontSize: '2.5rem' }}>SmartVenue <span className="text-gradient">AI</span></h1>
      </div>
      
      <div className="glass-panel" style={{ width: '400px', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input 
              type="text" 
              className="input-field" 
              placeholder="Full Name" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required 
            />
          )}
          <input 
            type="email" 
            className="input-field" 
            placeholder="Email Address" 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required 
          />
          <input 
            type="password" 
            className="input-field" 
            placeholder="Password" 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required 
          />
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-semi)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </a>
        </div>
      </div>
    </div>
  );
}
