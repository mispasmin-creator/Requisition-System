import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

export function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const demoUsers = [];
  const handleSelectDemoUser = () => { };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          boxShadow: 'var(--shadow-floating)',
          border: '1px solid var(--border-light)',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          zIndex: 10,
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 16px auto',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-deep-forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dce7d9',
              boxShadow: '0 6px 18px rgba(18, 34, 22, 0.25)',
            }}
          >
            <img src="/requisition-logo.png" alt="Requisition logo" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </div>

          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Requisition Slip System
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>

          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--status-overdue-bg)',
              color: 'var(--status-overdue-text)',
              border: '1px solid var(--status-overdue-border)',
              fontSize: '0.82rem',

            }}
          >
            {error}
          </div>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            or enter credentials
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Username
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--surface-subtle)',
              }}
            >
              <User size={16} color="var(--text-muted)" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.92rem',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--surface-subtle)',
              }}
            >
              <Lock size={16} color="var(--text-muted)" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.92rem',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--accent-sage)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              boxShadow: '0 4px 14px rgba(136, 163, 131, 0.35)',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </motion.button>
        </form>

        {/* Quick Demo Role Switcher */}
        <div style={{ display: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Quick Role Switcher
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-sage-dark)', fontWeight: 600 }}>
              All Roles Pre-Configured
            </span>
          </div>

          {/* Admin card at top if available */}
          {demoUsers.find((u) => u.username === 'admin') && (
            <button
              type="button"
              onClick={() => handleSelectDemoUser(demoUsers.find((u) => u.username === 'admin'))}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '12px',
                border: username === 'admin' ? '1.5px solid var(--accent-sage-dark)' : '1px solid var(--border-light)',
                backgroundColor: username === 'admin' ? 'var(--accent-mint-light)' : 'var(--surface-subtle)',
                cursor: 'pointer',
                marginBottom: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={16} color="var(--accent-sage-dark)" />
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    System Admin
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-sage-dark)', fontWeight: 600 }}>
                    Super Admin • Access to All 4 Stages & Users
                  </span>
                </div>
              </div>
              {username === 'admin' && <CheckCircle2 size={16} color="var(--accent-sage-dark)" />}
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {demoUsers
              .filter((u) => u.username !== 'admin')
              .map((u) => {
                const isSelected = username === u.username;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid var(--accent-sage-dark)' : '1px solid var(--border-light)',
                      backgroundColor: isSelected ? 'var(--accent-mint-light)' : 'var(--surface-subtle)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {u.displayName.split(' ')[0]}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 size={13} color="var(--accent-sage-dark)" />}
                  </button>
                );
              })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
