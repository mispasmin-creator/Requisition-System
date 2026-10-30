import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  LayoutDashboard,
  CheckSquare,
  Send,
  DollarSign,
  ShieldCheck,
  Archive,
  Settings,
  PlusCircle,
  LogOut,
  User,
  Shield,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
} from 'lucide-react';
import { LiveSyncIndicator } from './LiveSyncIndicator';

export function Shell({
  user,
  onLogout,
  currentTab,
  onSelectTab,
  onOpenNewRequisition,
  onExportCsv,
  counters,
  onSyncTriggered,
  children,
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('requisition_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('requisition_sidebar_collapsed', String(next));
      } catch { }
      return next;
    });
  };

  const animFrameRef = useRef(null);
  const touchDeviceRef = useRef(false);

  useEffect(() => {
    // Detect touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      touchDeviceRef.current = true;
      return;
    }

    const handleMouseMove = (e) => {
      if (touchDeviceRef.current) return;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        const xOffset = ((e.clientX / window.innerWidth) - 0.5) * 8; // capped at 4-8px
        const yOffset = ((e.clientY / window.innerHeight) - 0.5) * 8;
        setMousePos({ x: xOffset, y: yOffset });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Navigation Items with role-based visibility
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['*'] },
    {
      id: 'approval',
      label: 'Management Approval',
      icon: CheckSquare,
      roles: ['ea', 'admin'],
      badge: counters?.approval?.pending || 0,
    },
    {
      id: 'posting',
      label: 'Posting',
      icon: Send,
      roles: ['posting', 'admin'],
      badge: counters?.posting?.pending || 0,
    },
    {
      id: 'payment',
      label: 'Get Payment',
      icon: DollarSign,
      roles: ['payment', 'admin'],
      badge: counters?.payment?.pending || 0,
    },
    {
      id: 'audit',
      label: 'Audit Payments',
      icon: ShieldCheck,
      roles: ['auditor', 'admin'],
      badge: counters?.audit?.pending || 0,
    },
    { id: 'history', label: 'All Records', icon: Archive, roles: ['*'] },
    { id: 'admin', label: 'Administration', icon: Settings, roles: ['admin', 'ea'] },
  ];

  const isSuperAdmin =
    user?.isSuperAdmin ||
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'super admin' ||
    user?.username?.toLowerCase() === 'admin';

  const filteredNav = navItems.filter((item) => {
    if (isSuperAdmin) return true;
    if (user?.permissions && user.permissions[item.id] !== undefined) {
      return user.permissions[item.id] !== 'No';
    }
    return item.roles.includes('*') || item.roles.includes(user?.role);
  });

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        padding: '12px 18px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative ambient background rings matching reference image */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        {/* Ring 1 */}
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            right: '-10%',
            width: '800px',
            height: '800px',
            borderRadius: '50%',
            border: '1px solid rgba(136, 163, 131, 0.12)',
            transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 0)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
        {/* Ring 2 */}
        <div
          style={{
            position: 'absolute',
            top: '-5%',
            right: '0%',
            width: '650px',
            height: '650px',
            borderRadius: '50%',
            border: '1.5px solid rgba(178, 197, 168, 0.15)',
            transform: `translate3d(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px, 0)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
        {/* Ambient Sage Glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '-10%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(136, 163, 131, 0.1) 0%, transparent 70%)',
            transform: `translate3d(${-mousePos.x * 0.6}px, ${-mousePos.y * 0.6}px, 0)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      </div>

      {/* Main Floating Application Surface - Fixed viewport height */}
      <motion.main
        initial={{ opacity: 0, scale: 0.98, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '1720px',
          height: 'calc(100vh - 24px)',
          maxHeight: 'calc(100vh - 24px)',
          backgroundColor: 'var(--surface-floating)',
          borderRadius: 'var(--radius-floating)',
          boxShadow: 'var(--shadow-floating)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Vertical Sidebar - Fixed on left */}
        <aside
          style={{
            width: isCollapsed ? '72px' : '260px',
            minWidth: isCollapsed ? '72px' : '260px',
            maxWidth: isCollapsed ? '72px' : '260px',
            height: '100%',
            backgroundColor: '#ffffff',
            borderRight: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 11,
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Top Brand + Nav Area */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }}>
            {/* Sidebar Brand Header */}
            {isCollapsed ? (
              <div
                style={{
                  padding: '16px 10px',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Expand Sidebar (Click to Expand)"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '11px',
                    backgroundColor: 'var(--bg-deep-forest)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dce7d9',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(18, 34, 22, 0.22)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <PanelLeftOpen size={20} strokeWidth={2.2} />
                </button>
              </div>
            ) : (
              <div
                style={{
                  padding: '16px 14px 16px 18px',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-deep-forest)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dce7d9',
                      boxShadow: '0 4px 12px rgba(18, 34, 22, 0.22)',
                      flexShrink: 0,
                    }}
                  >
                    <img src="/requisition-logo.png" alt="Requisition logo" style={{ width: '27px', height: '27px', objectFit: 'contain' }} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '0.96rem',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: 'var(--text-primary)',
                        lineHeight: 1.15,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      REQUISITION SYSTEM
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Collapse Sidebar"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--surface-subtle)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-mint-light)';
                    e.currentTarget.style.color = 'var(--accent-sage-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-subtle)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <PanelLeftClose size={17} />
                </button>
              </div>
            )}

            {/* Scrollable Nav Items */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: isCollapsed ? '12px 8px' : '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {filteredNav.map((item) => {
                  const isActive = currentTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      title={isCollapsed ? `${item.label}${user?.permissions?.[item.id] === 'View' ? ' (View Only)' : ''}` : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'space-between',
                        width: '100%',
                        padding: isCollapsed ? '11px 0' : '9px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: isActive ? 700 : 600,
                        backgroundColor: isActive ? 'var(--accent-sage-dark)' : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-primary)',
                        boxShadow: isActive ? '0 3px 10px rgba(42, 71, 47, 0.22)' : 'none',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--accent-mint-light)';
                          e.currentTarget.style.color = 'var(--accent-sage-dark)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '10px', justifyContent: isCollapsed ? 'center' : 'flex-start', minWidth: 0 }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                          {isCollapsed && item.badge > 0 && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-8px',
                                minWidth: '15px',
                                height: '15px',
                                borderRadius: 'var(--radius-pill)',
                                backgroundColor: isActive ? 'var(--accent-mint)' : 'var(--status-overdue-bg)',
                                color: isActive ? 'var(--accent-sage-dark)' : 'var(--status-overdue-text)',
                                fontSize: '0.60rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 3px',
                                lineHeight: 1,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                          </span>
                        )}
                      </div>

                      {!isCollapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {user?.permissions?.[item.id] === 'View' && (
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(0,0,0,0.06)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              View
                            </span>
                          )}
                          {item.badge > 0 && (
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-pill)',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                backgroundColor: isActive ? 'var(--accent-mint)' : 'var(--status-overdue-bg)',
                                color: isActive ? 'var(--accent-sage-dark)' : 'var(--status-overdue-text)',
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sidebar Bottom: Sync Status & User Profile - Fixed at bottom */}
          {isCollapsed ? (
            <div
              style={{
                padding: '12px 6px',
                borderTop: '1px solid var(--border-light)',
                backgroundColor: 'var(--surface-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div
                title={`${user?.displayName || 'User'} (${isSuperAdmin ? 'Super Admin' : (user?.role || 'User')})`}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: isSuperAdmin ? '#fef7e0' : 'var(--accent-mint)',
                  color: isSuperAdmin ? '#9c6f16' : 'var(--accent-sage-dark)',
                  border: isSuperAdmin ? '1px solid #f9e2af' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  flexShrink: 0,
                  cursor: 'default',
                }}
              >
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Log Out"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#c0392b';
                  e.currentTarget.style.backgroundColor = '#fde8e7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderTop: '1px solid var(--border-light)',
                backgroundColor: 'var(--surface-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-light)',
                  boxShadow: '0 1px 4px rgba(18, 36, 22, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: isSuperAdmin ? '#fef7e0' : 'var(--accent-mint)',
                      color: isSuperAdmin ? '#9c6f16' : 'var(--accent-sage-dark)',
                      border: isSuperAdmin ? '1px solid #f9e2af' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      flexShrink: 0,
                    }}
                  >
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.15,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {user?.displayName || 'User'}
                    </span>
                    {isSuperAdmin ? (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#9c6f16',
                          backgroundColor: '#fef7e0',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          marginTop: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        Super Admin
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {user?.role || 'Guest'}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  title="Log Out"
                  style={{
                    padding: '6px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#c0392b';
                    e.currentTarget.style.backgroundColor = '#fde8e7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Right Main Content Area - Only viewport scrolls */}
        <div
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {/* Top Bar inside Content Area */}
          <header
            style={{
              padding: '14px 24px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              flexShrink: 0,
              gap: '14px',
            }}
          >
            {/* Current Active Page Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '5px',
                  height: '22px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--accent-sage-dark)',
                }}
              />
              <h1
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {filteredNav.find((item) => item.id === currentTab)?.label || 'Dashboard'}
              </h1>
            </div>

            {/* Top Action Center: Export CSV + New Requisition Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LiveSyncIndicator onSyncTriggered={onSyncTriggered} />

              {onExportCsv && (
                <button
                  type="button"
                  onClick={onExportCsv}
                  title="Export records to CSV file"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 15px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--accent-sage-dark)',
                    fontSize: '0.84rem',
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
                  <Download size={15} strokeWidth={2.4} />
                  <span>Export CSV</span>
                </button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onOpenNewRequisition}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--accent-sage)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(136, 163, 131, 0.35)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-sage-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-sage)')}
              >
                <PlusCircle size={17} strokeWidth={2.4} />
                <span>New Requisition</span>
              </motion.button>
            </div>
          </header>

          {/* Page Content Viewport */}
          <div
            style={{
              flex: 1,
              padding: '20px 26px',
              backgroundColor: 'var(--surface-floating)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            {children}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
