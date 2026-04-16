import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1rem 2rem',
      background: 'rgba(15, 17, 26, 0.8)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <Activity size={28} color="var(--primary)" />
        <h2 style={{ marginLeft: '10px', fontSize: '1.5rem', margin: 0 }}>SmartVenue <span className="text-gradient">AI</span></h2>
      </div>
      
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: 'var(--text-semi)' }}>Hello, {user.name}</span>
          {user.role === 'ADMIN' && (
             <span style={{ background: 'var(--warning)', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>ADMIN</span>
          )}
          <button onClick={handleLogout} style={{ background: 'transparent', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      )}
    </nav>
  );
}
