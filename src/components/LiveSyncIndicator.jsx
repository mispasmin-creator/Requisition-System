import React, { useState, useEffect } from 'react';
import { RefreshCw, Radio, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export function LiveSyncIndicator({ onSyncTriggered }) {
  const [syncStatus, setSyncStatus] = useState({
    connected: true,
    lastSuccess: new Date().toISOString(),
    mode: 'GVIZ_LIVE_READER',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeAgo, setTimeAgo] = useState('just now');

  useEffect(() => {
    // Listen to Server-Sent Events (SSE)
    let eventSource;
    try {
      eventSource = new EventSource('/api/sync/events');
      eventSource.onopen = () => {
        setSyncStatus((prev) => ({ ...prev, connected: true }));
      };
      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.lastSync || payload.timestamp) {
            setSyncStatus((prev) => ({
              ...prev,
              connected: true,
              lastSuccess: payload.lastSync || payload.timestamp,
            }));
          }
          if (onSyncTriggered) onSyncTriggered(payload);
        } catch (err) {}
      };
      eventSource.onerror = () => {
        setSyncStatus((prev) => ({ ...prev, connected: false }));
      };
    } catch (err) {}

    // Fetch initial config for status
    api.getConfig().then((cfg) => {
      if (cfg && cfg.syncStatus) {
        setSyncStatus(cfg.syncStatus);
      }
    }).catch(() => {});

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Update timeAgo string every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (!syncStatus.lastSuccess) {
        setTimeAgo('connecting...');
        return;
      }
      const diffSec = Math.floor((Date.now() - new Date(syncStatus.lastSuccess).getTime()) / 1000);
      if (diffSec < 5) setTimeAgo('just now');
      else if (diffSec < 60) setTimeAgo(`${diffSec}s ago`);
      else setTimeAgo(`${Math.floor(diffSec / 60)}m ago`);
    }, 3000);
    return () => clearInterval(timer);
  }, [syncStatus.lastSuccess]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.triggerSync();
      setSyncStatus((prev) => ({ ...prev, ...res.syncStatus, lastSuccess: res.lastSyncTime }));
      if (onSyncTriggered) onSyncTriggered();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        backgroundColor: 'var(--surface-subtle)',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border-light)',
        fontSize: '0.82rem',
      }}
    >
      {/* Pulse Dot */}
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: syncStatus.connected ? '#2ecc71' : '#e74c3c',
          boxShadow: syncStatus.connected ? '0 0 8px #2ecc71' : 'none',
          display: 'inline-block',
        }}
      />

      {/* Manual refresh button */}
      <button
        type="button"
        onClick={handleManualSync}
        disabled={isSyncing}
        title="Sync latest changes"
        style={{
          background: 'none',
          border: 'none',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          padding: '3px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-sage-dark)',
          transition: 'transform 0.2s ease',
        }}
      >
        <RefreshCw
          size={13}
          style={{
            animation: isSyncing ? 'spin 1s linear infinite' : 'none',
          }}
        />
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </span>
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
