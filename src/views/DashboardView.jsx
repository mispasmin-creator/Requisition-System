import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Send, DollarSign, ShieldCheck, ArrowRight, FileText, Download } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StageBadge } from '../components/StageBadge';
import { MobileRequisitionCard } from '../components/MobileRequisitionCard';
import { exportRequisitionsCsv } from '../utils/csvExport';
import { useIsMobile } from '../utils/useIsMobile';

export function DashboardView({
  requisitions = [],
  counters,
  activeFilter,
  onSelectFilter,
  onOpenStageAction,
  onOpenNewRequisition,
  onOpenSettings,
  onSelectTab,
  user,
}) {
  const isMobile = useIsMobile(768);
  const recentRequisitions = [...requisitions].reverse().slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '26px' }}>
      {/* 1. Header Overview Banner */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: isMobile ? '10px' : '14px',
          padding: isMobile ? '14px 16px' : '20px 24px',
          borderRadius: '18px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: isMobile ? '1.22rem' : '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Workflow Operations Hub
            </h2>
            {user?.role === 'admin' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--accent-mint-light)',
                  border: '1px solid var(--accent-mint)',
                  color: 'var(--accent-sage-dark)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                <ShieldCheck size={14} /> Full Access Admin
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>

          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => exportRequisitionsCsv(requisitions, 'Dashboard_All_Requisitions', '', { view: 'dashboard' })}
            title={`Export all ${requisitions.length} requisitions to CSV`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: isMobile ? '7px 12px' : '9px 18px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-strong)',
              color: 'var(--accent-sage-dark)',
              fontSize: isMobile ? '0.78rem' : '0.86rem',
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
            <span>Export CSV</span>
            <span
              style={{
                fontSize: '0.70rem',
                padding: '1px 6px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-mint-light)',
                color: 'var(--accent-sage-dark)',
                fontWeight: 800,
              }}
            >
              {requisitions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab?.('history')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: isMobile ? '7px 12px' : '9px 18px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontSize: isMobile ? '0.78rem' : '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileText size={14} />
            <span>All Records</span>
          </button>
        </div>
      </motion.div>

      {/* 2. Summary Stat Cards with Direct Page Navigation (Compact 2-col on mobile) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: isMobile ? '10px' : '12px',
        }}
      >
        <StatCard
          stageName="Management Approval"
          stageKey="approval"
          counters={counters?.approval}
          onNavigate={() => onSelectTab?.('approval')}
        />

        <StatCard
          stageName="Posting"
          stageKey="posting"
          counters={counters?.posting}
          onNavigate={() => onSelectTab?.('posting')}
        />

        <StatCard
          stageName="Get Payment"
          stageKey="payment"
          counters={counters?.payment}
          onNavigate={() => onSelectTab?.('payment')}
        />

        <StatCard
          stageName="Audit Payments"
          stageKey="audit"
          counters={counters?.audit}
          onNavigate={() => onSelectTab?.('audit')}
        />

        <StatCard
          stageName="Tally Entry"
          stageKey="tally"
          counters={counters?.tally}
          onNavigate={() => onSelectTab?.('tally')}
        />
      </div>

      {/* 3. Recent Activity Preview (Desktop Table View) */}
      <div
        className="desktop-only"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Recent Requisitions Activity
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => exportRequisitionsCsv(recentRequisitions, 'Recent_Requisitions', '', { view: 'dashboard' })}
              title="Export recent activity rows to CSV"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-strong)',
                color: 'var(--accent-sage-dark)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-mint-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <Download size={13} strokeWidth={2.4} />
              <span>Export Recent CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab?.('history')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-mint-light)',
                color: 'var(--accent-sage-dark)',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>Open All Records Page</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto', overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>RS-Indent No.</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Date</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Requester</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Firm Name</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'right', whiteSpace: 'nowrap' }}>Amount</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Mode</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f4f7f3', padding: '11px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Current Stage Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No requisitions recorded yet.
                  </td>
                </tr>
              ) : (
                recentRequisitions.map((r) => (
                  <tr key={r.rsIndentNo} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-sage-dark)' }}>
                      {r.rsIndentNo}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {r.timestamp}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.requesterName}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{r.firmName || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--accent-sage-dark)' }} className="num-financial">
                      ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{r.mode}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <StageBadge
                        status={
                          !r.actualApproval ? 'PENDING' :
                            !r.actualPosting ? 'PENDING' :
                              !r.actualPayment ? 'PENDING' :
                                !r.actualAudit ? 'PENDING' :
                                  !r.actualTally ? 'PENDING' : 'COMPLETED'
                        }
                        label={
                          !r.actualApproval ? '1. Pending Approval' :
                            !r.actualPosting ? '2. Pending Posting' :
                              !r.actualPayment ? '3. Pending Payment' :
                                !r.actualAudit ? '4. Pending Audit' :
                                  !r.actualTally ? '5. Pending Tally' : 'Completed'
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Mobile Professional Recent Activity (Clean FinTech Style List) */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#16291a', margin: 0, letterSpacing: '0.01em' }}>
            Recent Activity
          </h3>
          <button
            type="button"
            onClick={() => onSelectTab?.('history')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              background: 'none',
              color: 'var(--accent-sage-dark)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            <span>See All</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {recentRequisitions.length === 0 ? (
          <div
            style={{
              padding: '20px 14px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              fontSize: '0.84rem',
            }}
          >
            No requisitions recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentRequisitions.map((r) => {
              // Calculate current stage status pill
              let stageBadge = { label: 'Approval', bg: '#fef3e7', color: '#8a4d10' };
              if (!r.actualApproval) stageBadge = { label: 'Pending Approval', bg: '#fef3e7', color: '#8a4d10' };
              else if (!r.actualPosting) stageBadge = { label: 'Pending Posting', bg: '#fef3e7', color: '#8a4d10' };
              else if (!r.actualPayment) stageBadge = { label: 'Pending Payment', bg: '#fef3e7', color: '#8a4d10' };
              else if (!r.actualAudit) stageBadge = { label: 'Pending Audit', bg: '#fef3e7', color: '#8a4d10' };
              else if (!r.actualTally) stageBadge = { label: 'Pending Tally', bg: '#eef5ec', color: '#254228' };
              else stageBadge = { label: 'Completed', bg: '#d7eed3', color: '#144917' };

              return (
                <motion.div
                  key={r.rsIndentNo}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenStageAction?.(r, 'ALL')}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    padding: '11px 13px',
                    border: '1px solid #e7efe5',
                    boxShadow: '0 2px 6px rgba(18, 36, 22, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    touchAction: 'pan-y',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Left: Icon Badge + Requester Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        backgroundColor: '#f1f6ef',
                        color: '#2a472f',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: 800,
                        fontSize: '0.74rem',
                      }}
                    >
                      RS
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            color: '#1a311d',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.rsIndentNo}
                        </span>
                        <span
                          style={{
                            fontSize: '0.80rem',
                            fontWeight: 700,
                            color: '#2b3f2e',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.requesterName}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '0.70rem',
                          color: '#6e8571',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.firmName ? `${r.firmName} • ` : ''}{r.date || r.timestamp} {r.mode ? `• ${r.mode}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount + Stage Status Micro Pill */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                    <span
                      className="num-financial"
                      style={{
                        fontSize: '0.94rem',
                        fontWeight: 800,
                        color: '#162b1a',
                        lineHeight: 1.15,
                      }}
                    >
                      ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: stageBadge.bg,
                        color: stageBadge.color,
                        marginTop: '3px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {stageBadge.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
