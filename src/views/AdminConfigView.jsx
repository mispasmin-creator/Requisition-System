import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Eye,
  EyeOff,
  Edit2,
  Building,
  Key,
  Search,
  Check,
  X,
  Code,
  Download,
} from 'lucide-react';
import { exportUsersCsv } from '../utils/csvExport';
import { useIsMobile } from '../utils/useIsMobile';

const PAGE_KEYS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'approval', label: 'Management Approval', icon: '✍️' },
  { id: 'posting', label: 'Posting', icon: '📤' },
  { id: 'payment', label: 'Get Payment', icon: '💵' },
  { id: 'audit', label: 'Audit Payments', icon: '🛡️' },
  { id: 'history', label: 'All Records', icon: '📁' },
  { id: 'admin', label: 'Administration', icon: '⚙️' },
];

const PRESETS = {
  ADMIN: {
    label: 'Super Admin',
    desc: 'Full authority across ALL firms and ALL pages & stages',
    perms: { dashboard: 'Full', approval: 'Full', posting: 'Full', payment: 'Full', audit: 'Full', history: 'Full', admin: 'Full' },
  },
  EA: {
    label: 'Approval Manager',
    desc: 'Full approval access, view-only on financial stages',
    perms: { dashboard: 'Full', approval: 'Full', posting: 'View', payment: 'View', audit: 'View', history: 'Full', admin: 'No' },
  },
  POSTING: {
    label: 'Posting Manager',
    desc: 'Full posting access, view-only on approval and payment',
    perms: { dashboard: 'Full', approval: 'View', posting: 'Full', payment: 'View', audit: 'View', history: 'Full', admin: 'No' },
  },
  PAYMENT: {
    label: 'Payment Manager',
    desc: 'Full payment recording access, view-only on other stages',
    perms: { dashboard: 'Full', approval: 'View', posting: 'View', payment: 'Full', audit: 'View', history: 'Full', admin: 'No' },
  },
  AUDITOR: {
    label: 'Audit Manager',
    desc: 'Full audit verification access, view-only on all records',
    perms: { dashboard: 'Full', approval: 'View', posting: 'View', payment: 'View', audit: 'Full', history: 'Full', admin: 'No' },
  },
  VIEW_ONLY: {
    label: 'Read-only User',
    desc: 'Read-only visibility on all operational pages with 0 action writes',
    perms: { dashboard: 'View', approval: 'View', posting: 'View', payment: 'View', audit: 'View', history: 'View', admin: 'No' },
  },
};

export function AdminConfigView({ user }) {
  const isMobile = useIsMobile(768);
  const [activeMainTab, setActiveMainTab] = useState('USERS'); // 'USERS' | 'SCHEMA' | 'APPS_SCRIPT'
  const [usersList, setUsersList] = useState([]);
  const [firmOptions, setFirmOptions] = useState([]);
  const [config, setConfig] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal / Form state for Add/Edit User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [formFeedback, setFormFeedback] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    role: 'requester',
    password: '',
    status: 'Active',
    firmAccess: 'ALL',
    permissions: {
      dashboard: 'Full',
      approval: 'No',
      posting: 'No',
      payment: 'No',
      audit: 'No',
      history: 'Full',
      admin: 'No',
    },
  });

  // Schema & Apps Script Tab state
  const [firmColInput, setFirmColInput] = useState('W');
  const [saveMsg, setSaveMsg] = useState('');
  const [appsScriptData, setAppsScriptData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const loadData = async () => {
    setLoadingUsers(true);
    try {
      const [adminUsersData, configData, scriptData] = await Promise.all([
        api.getAdminUsers().catch((err) => {
          console.warn('Failed to fetch admin users:', err);
          return { users: [], firmNames: [] };
        }),
        api.getConfig().catch((err) => {
          console.warn('Failed to fetch config:', err);
          return null;
        }),
        api.getAppsScriptCode().catch((err) => {
          console.warn('Failed to fetch apps script code:', err);
          return null;
        }),
      ]);

      setUsersList(adminUsersData?.users || []);
      setFirmOptions(adminUsersData?.firmNames || []);
      if (scriptData) {
        setAppsScriptData(scriptData);
      }
      if (configData) {
        setConfig(configData);
        if (configData?.schemaReport?.firmNameStatus?.configuredColumn) {
          setFirmColInput(configData.schemaReport.firmNameStatus.configuredColumn);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewUserModal = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      username: '',
      role: 'requester',
      password: '',
      status: 'Active',
      firmAccess: 'ALL',
      permissions: {
        dashboard: 'Full',
        approval: 'No',
        posting: 'No',
        payment: 'No',
        audit: 'No',
        history: 'Full',
        admin: 'No',
      },
    });
    setFormFeedback({ type: '', text: '' });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditUserModal = (u) => {
    if (u.role === 'admin' || u.username?.toLowerCase() === 'admin') return;
    setEditingUser(u);
    setFormData({
      fullName: u.fullName || u.displayName || '',
      username: u.username,
      role: u.role || 'requester',
      password: u.password || '',
      status: u.status || 'Active',
      firmAccess: u.firmAccess || 'ALL',
      permissions: {
        dashboard: u.permissions?.dashboard || 'Full',
        approval: u.permissions?.approval || 'No',
        posting: u.permissions?.posting || 'No',
        payment: u.permissions?.payment || 'No',
        audit: u.permissions?.audit || 'No',
        history: u.permissions?.history || 'Full',
        admin: u.permissions?.admin || 'No',
      },
    });
    setFormFeedback({ type: '', text: '' });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleApplyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      if (presetKey === 'ADMIN') {
        setFormData((prev) => ({
          ...prev,
          role: 'admin',
          firmAccess: 'ALL',
          permissions: { ...preset.perms },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          permissions: { ...preset.perms },
        }));
      }
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.username.trim()) {
      setFormFeedback({ type: 'error', text: 'Full Name and Username are required.' });
      return;
    }

    setSavingUser(true);
    setFormFeedback({ type: '', text: '' });

    try {
      const res = await api.saveAdminUser(formData);
      setFormFeedback({
        type: 'success',
        text: res.message || 'User saved and synced to Google Sheet Login page successfully!',
      });
      await loadData();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1200);
    } catch (err) {
      setFormFeedback({ type: 'error', text: err.message || 'Failed to save user.' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveFirmCol = async (e) => {
    e.preventDefault();
    setSaveMsg('');
    try {
      await api.updateConfig({ firmNameColumn: firmColInput });
      setSaveMsg('Configuration saved successfully!');
      await loadData();
    } catch (err) {
      setSaveMsg(`Error: ${err.message}`);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.firmAccess && u.firmAccess.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <style>{`[data-admin-stats] > div:nth-child(3), button[hidden] { display: none !important; }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: isMobile ? 'auto' : '100%', minHeight: 0, flex: isMobile ? 'none' : 1 }}>
        {/* Top Header Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--accent-sage-dark)',
                }}
              >
                Control Panel & Security
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
              Administration & Access Control
            </h2>
          </div>

          {/* Top Tab Switcher */}
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-light)',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveMainTab('USERS')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                backgroundColor: activeMainTab === 'USERS' ? 'var(--accent-sage-dark)' : 'transparent',
                color: activeMainTab === 'USERS' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={15} />
              <span>User Management</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('SCHEMA')}
              hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                backgroundColor: activeMainTab === 'SCHEMA' ? 'var(--accent-sage-dark)' : 'transparent',
                color: activeMainTab === 'SCHEMA' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <FileSpreadsheet size={15} />
              <span>Google Sheets Schema</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('APPS_SCRIPT')}
              hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                backgroundColor: activeMainTab === 'APPS_SCRIPT' ? 'var(--accent-sage-dark)' : 'transparent',
                color: activeMainTab === 'APPS_SCRIPT' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Code size={15} />
              <span>Apps Script Code (Sync Engine)</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: USER ADMINISTRATION & PERMISSIONS MATRIX           */}
        {/* ========================================================= */}
        {activeMainTab === 'USERS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
            {/* Quick Stat Tiles */}
            <div
              data-admin-stats
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Registered</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {usersList.length} Users
                  </div>
                </div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--accent-mint-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-sage-dark)',
                  }}
                >
                  <Users size={18} />
                </div>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Status</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#27ae60' }}>
                    {usersList.filter((u) => u.status === 'Active').length} Active
                  </div>
                </div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#d7eed3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#144917',
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Google Sheet Tab</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-sage-dark)' }}>
                    Login page
                  </div>
                </div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--surface-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)',
                  }}
                >
                  <FileSpreadsheet size={18} />
                </div>
              </div>
            </div>

            {/* Action and Search Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                backgroundColor: '#ffffff',
                padding: '10px 16px',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
                flexShrink: 0,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user by name, username, role, or firm..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.88rem',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={loadData}
                  title="Reload from Google Sheets"
                  style={{
                    padding: '7px 12px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} className={loadingUsers ? 'spin' : ''} />
                  <span>Sync</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportUsersCsv(filteredUsers)}
                  title={`Export ${filteredUsers.length} users to CSV file`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--accent-sage-dark)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(18, 36, 22, 0.05)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-mint-light)';
                    e.currentTarget.style.borderColor = 'var(--accent-sage)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                  }}
                >
                  <Download size={14} strokeWidth={2.4} />
                  <span>Export Users CSV</span>
                  <span
                    style={{
                      fontSize: '0.70rem',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--accent-mint-light)',
                      color: 'var(--accent-sage-dark)',
                      fontWeight: 800,
                    }}
                  >
                    {filteredUsers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openNewUserModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--accent-sage-dark)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(42, 71, 47, 0.25)',
                  }}
                >
                  <UserPlus size={15} />
                  <span>+ Add User</span>
                </button>
              </div>
            </div>

            {/* User Directory Table Card with Sticky Frozen Header */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    textAlign: 'left',
                    fontSize: '0.86rem',
                  }}
                >
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Full Name</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Username</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Role</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Status</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Firm Access</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Page Permissions Breakdown</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {loadingUsers ? 'Loading user registry from Login page sheet...' : 'No users found matching query.'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isActive = u.status === 'Active';
                        const p = u.permissions || {};

                        return (
                          <tr
                            key={u.username}
                            style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.12s ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(235, 243, 235, 0.45)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {u.fullName || u.displayName || u.username}
                            </td>
                            <td style={{ padding: '10px 16px', color: 'var(--accent-sage-dark)', fontFamily: 'monospace', fontWeight: 600 }}>
                              @{u.username}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {u.role === 'admin' ? (
                                <span
                                  style={{
                                    padding: '2px 9px',
                                    borderRadius: 'var(--radius-pill)',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    backgroundColor: '#fef7e0',
                                    color: '#9c6f16',
                                    border: '1px solid #f9e2af',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  Super Admin
                                </span>
                              ) : (
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-pill)',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    backgroundColor: 'var(--surface-subtle)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-light)',
                                  }}
                                >
                                  {u.role}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-pill)',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  backgroundColor: isActive ? '#d7eed3' : '#fde8e7',
                                  color: isActive ? '#144917' : '#8e1f1a',
                                }}
                              >
                                {u.status || 'Active'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: u.role === 'admin' || u.firmAccess === 'ALL' ? '#eff6ff' : 'var(--surface-subtle)',
                                  border: '1px solid var(--border-light)',
                                  fontSize: '0.75rem',
                                  fontWeight: u.role === 'admin' || u.firmAccess === 'ALL' ? 700 : 500,
                                  color: u.role === 'admin' || u.firmAccess === 'ALL' ? '#1d4ed8' : 'var(--text-secondary)',
                                  maxWidth: '180px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={u.firmAccess}
                              >
                                <Building size={11} />
                                {u.role === 'admin' || u.firmAccess === 'ALL' ? 'ALL (All Firms)' : u.firmAccess}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {PAGE_KEYS.map((page) => {
                                  const level = p[page.id] || (u.role === 'admin' ? 'Full' : 'No');
                                  if (level === 'No') return null;

                                  const isFull = level === 'Full';
                                  return (
                                    <span
                                      key={page.id}
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: isFull ? 'var(--accent-mint-light)' : '#f0f3ef',
                                        color: isFull ? 'var(--accent-sage-dark)' : 'var(--text-muted)',
                                        border: `1px solid ${isFull ? 'var(--accent-mint)' : 'var(--border-light)'}`,
                                      }}
                                      title={`${page.label}: ${level} Access`}
                                    >
                                      {page.label}: {level}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              {u.role !== 'admin' && u.username?.toLowerCase() !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => openEditUserModal(u)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-pill)',
                                    backgroundColor: 'var(--surface-subtle)',
                                    border: '1px solid var(--border-light)',
                                    color: 'var(--accent-sage-dark)',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Edit2 size={12} />
                                  <span>Edit</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: GOOGLE SHEETS SCHEMA & SAFETY DIAGNOSTICS          */}
        {/* ========================================================= */}
        {activeMainTab === 'SCHEMA' && config && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* Row 6 Live Comparison Table */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 18px', backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Row 6 Header Mapping Validation (FMS Sheet)
                </h3>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Formula columns (J, L, O, Q, R, T, U, W) remain strictly protected and cannot be written by anyone.
                </p>
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'auto', borderTop: '1px solid var(--border-light)' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)' }}>Col</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)' }}>Specification</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)' }}>Detected in Sheet</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)' }}>Safety</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].map((col) => {
                      const canonical = config.schemaReport?.resolvedMapping?.[col] || '';
                      const detectedVal = config.schemaReport?.detectedHeaders?.[col] || '(empty)';
                      const isProtected = config.protectedFormulaColumns.includes(col);

                      return (
                        <tr key={col} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 16px', fontWeight: 700, color: 'var(--accent-sage-dark)' }}>{col}</td>
                          <td style={{ padding: '8px 16px', fontWeight: 600 }}>{canonical || '—'}</td>
                          <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>{detectedVal}</td>
                          <td style={{ padding: '8px 16px' }}>
                            {isProtected ? (
                              <span style={{ color: '#c0392b', fontWeight: 600, fontSize: '0.78rem' }}>
                                <Lock size={11} style={{ display: 'inline', marginRight: '4px' }} /> Read-Only (Formula)
                              </span>
                            ) : (
                              <span style={{ color: 'var(--accent-sage-dark)', fontWeight: 600, fontSize: '0.78rem' }}>
                                Writable (Safety Verified)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GOOGLE APPS SCRIPT LIVE SYNC ENGINE CODE           */}
        {/* ========================================================= */}
        {activeMainTab === 'APPS_SCRIPT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* Diagnostic Action Banner */}
            <div
              style={{
                padding: '18px 22px',
                backgroundColor: '#fffbeb',
                borderRadius: '16px',
                border: '1px solid #fde68a',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>⚡</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400e', margin: 0 }}>
                      Google Apps Script Live Sync Engine (v2.2 with Drive Upload)
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: '#78350f', margin: '6px 0 0 0', lineHeight: 1.5, maxWidth: '850px' }}>
                    Is updated script me 2 important enhancements hain: <br />
                    1. <strong>Google Drive Auto-Upload:</strong> App me koi bhi image ya PDF upload hone par directly aapke designated Drive folder (<a href="https://drive.google.com/drive/folders/1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR?lfhs=2" target="_blank" rel="noopener noreferrer" style={{ color: '#1e40af', fontWeight: 700, textDecoration: 'underline' }}>Folder: 1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR ↗</a>) me save hogi aur uska share link Google Sheet ke Column I (Any Attchments) me auto-save hoga.<br />
                    2. <strong>Login Page Permissions Sync:</strong> <em>Login page</em> tab ke sabhi columns (Dashboard, Management Approval, Posting, Get Payment, Audit Payments, All Records, Administration) safely synchronize honge.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (appsScriptData?.code) {
                      navigator.clipboard.writeText(appsScriptData.code);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2500);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: copySuccess ? '#27ae60' : 'var(--accent-sage-dark)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(42, 71, 47, 0.25)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  {copySuccess ? <Check size={16} /> : <Code size={16} />}
                  <span>{copySuccess ? 'Copied to Clipboard!' : '📋 Copy Updated Apps Script Code'}</span>
                </button>
              </div>

              {/* Quick 4-step tutorial cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '10px',
                  marginTop: '4px',
                }}
              >
                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>STEP 1: COPY CODE</div>
                  <div style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '2px' }}>Upar "Copy Code" button par click karein.</div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>STEP 2: OPEN APPS SCRIPT</div>
                  <div style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '2px' }}>Google Sheet me <strong>Extensions &gt; Apps Script</strong> kholein.</div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>STEP 3: PASTE & SAVE</div>
                  <div style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '2px' }}>Purana code delete karke paste karein aur Save (Ctrl+S) karein.</div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>STEP 4: NEW VERSION DEPLOY</div>
                  <div style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '2px' }}><strong>Deploy &gt; Manage deployments &gt; Edit (Pencil) &gt; Version: New version &gt; Deploy</strong> karein.</div>
                </div>
              </div>
            </div>

            {/* Code Viewer Container */}
            <div
              style={{
                backgroundColor: '#1e241f',
                borderRadius: '16px',
                border: '1px solid #2d382f',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  backgroundColor: '#161a17',
                  borderBottom: '1px solid #2d382f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#e74c3c' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f1c40f' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2ecc71' }} />
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace', marginLeft: '6px' }}>
                    appsScriptCode.js (v2.1 Google Apps Script Live Engine)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (appsScriptData?.code) {
                      navigator.clipboard.writeText(appsScriptData.code);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2500);
                    }
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#1e293b',
                    color: '#e2e8f0',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copySuccess ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              <pre
                style={{
                  margin: 0,
                  padding: '16px 20px',
                  fontSize: '0.82rem',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  color: '#d1fae5',
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: '400px',
                  lineHeight: 1.5,
                }}
              >
                {appsScriptData?.code || '// Loading Google Apps Script code...'}
              </pre>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: ADD / EDIT USER DIALOG                             */}
        {/* ========================================================= */}
        {isModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(10, 20, 13, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '680px',
                maxHeight: '92vh',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-floating)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 22px',
                  borderBottom: '1px solid var(--border-light)',
                  backgroundColor: 'var(--surface-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {editingUser ? `Edit User: @${editingUser.username}` : 'Add New User'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>

                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '50%',
                    color: 'var(--text-muted)',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Form Scrollable Body */}
              <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {formFeedback.text && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: formFeedback.type === 'success' ? '#d7eed3' : '#fde8e7',
                        color: formFeedback.type === 'success' ? '#144917' : '#8e1f1a',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      {formFeedback.text}
                    </div>
                  )}

                  {/* Section 1: Basic Identity */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!!editingUser}
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                        placeholder="e.g. rahul_s"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          outline: 'none',
                          backgroundColor: editingUser ? '#f5f5f5' : '#ffffff',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          if (newRole === 'admin') {
                            setFormData({
                              ...formData,
                              role: 'admin',
                              firmAccess: 'ALL',
                              permissions: {
                                dashboard: 'Full',
                                approval: 'Full',
                                posting: 'Full',
                                payment: 'Full',
                                audit: 'Full',
                                history: 'Full',
                                admin: 'Full',
                              },
                            });
                          } else {
                            setFormData({ ...formData, role: newRole });
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          outline: 'none',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="requester">User</option>
                      </select>
                    </div>

                    {formData.role === 'admin' && (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          backgroundColor: '#fef7e0',
                          border: '1px solid #f9e2af',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <ShieldCheck size={22} color="#9c6f16" />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#9c6f16' }}>
                            Admin
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#7a540a', marginTop: '1px' }}>

                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={editingUser ? 'Leave blank to retain current' : 'Set login password'}
                          style={{
                            width: '100%',
                            padding: '9px 36px 9px 12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.86rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          outline: 'none',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="Active">Active (Can Log In)</option>
                        <option value="Inactive">Inactive (Suspended)</option>
                      </select>
                    </div>

                    {/* Firm Allocation */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Firm Allocation / Access Scope
                      </label>
                      <select
                        value={formData.firmAccess}
                        onChange={(e) => setFormData({ ...formData, firmAccess: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          outline: 'none',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="ALL">ALL (All Organizations & Firms)</option>
                        {firmOptions.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Section 2: Page Access Matrix */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>

                        </h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>

                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {Object.keys(PRESETS).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleApplyPreset(k)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-pill)',
                              border: '1px solid var(--border-light)',
                              backgroundColor: 'var(--surface-subtle)',
                              color: 'var(--text-secondary)',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {PRESETS[k].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Page rows table */}
                    <div
                      style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700 }}>Page Name</th>
                            <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: '#27ae60' }}>Full Access</th>
                            <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: '#2980b9' }}>View Only</th>
                            <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: '#c0392b' }}>No Access</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PAGE_KEYS.map((page) => {
                            const currentLevel = formData.permissions[page.id] || 'No';

                            return (
                              <tr key={page.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  <span style={{ marginRight: '6px' }}>{page.icon}</span>
                                  {page.label}
                                </td>

                                {/* Full Access Radio */}
                                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                  <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                    <input
                                      type="radio"
                                      name={`perm_${page.id}`}
                                      checked={currentLevel === 'Full'}
                                      onChange={() =>
                                        setFormData({
                                          ...formData,
                                          permissions: { ...formData.permissions, [page.id]: 'Full' },
                                        })
                                      }
                                    />
                                  </label>
                                </td>

                                {/* View Only Radio */}
                                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                  <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                    <input
                                      type="radio"
                                      name={`perm_${page.id}`}
                                      checked={currentLevel === 'View'}
                                      onChange={() =>
                                        setFormData({
                                          ...formData,
                                          permissions: { ...formData.permissions, [page.id]: 'View' },
                                        })
                                      }
                                    />
                                  </label>
                                </td>

                                {/* No Access Radio */}
                                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                  <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                    <input
                                      type="radio"
                                      name={`perm_${page.id}`}
                                      checked={currentLevel === 'No'}
                                      onChange={() =>
                                        setFormData({
                                          ...formData,
                                          permissions: { ...formData.permissions, [page.id]: 'No' },
                                        })
                                      }
                                    />
                                  </label>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    padding: '14px 22px',
                    borderTop: '1px solid var(--border-light)',
                    backgroundColor: 'var(--surface-subtle)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: '#ffffff',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingUser}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 20px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--accent-sage-dark)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: savingUser ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(42, 71, 47, 0.25)',
                    }}
                  >
                    {savingUser ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        <span>Saving & Syncing to Sheet...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save & Sync to Sheet</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
