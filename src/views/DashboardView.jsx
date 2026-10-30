import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Send, DollarSign, ShieldCheck, ArrowRight, FileText, Download } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StageBadge } from '../components/StageBadge';
import { MobileRequisitionCard } from '../components/MobileRequisitionCard';
import { exportRequisitionsCsv } from '../utils/csvExport';

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
  const recentRequisitions = [...requisitions].reverse().slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
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
          gap: '14px',
          padding: '20px 24px',
          borderRadius: '18px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => exportRequisitionsCsv(requisitions, 'Dashboard_All_Requisitions', '', { view: 'dashboard' })}
            title={`Export all ${requisitions.length} requisitions to CSV`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-strong)',
              color: 'var(--accent-sage-dark)',
              fontSize: '0.86rem',
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
            <span
              style={{
                fontSize: '0.72rem',
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
              padding: '9px 18px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileText size={15} />
            <span>View All Records Page</span>
          </button>
        </div>
      </motion.div>

      {/* 2. Summary Stat Cards (4 Stages) with Direct Page Navigation */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '12px',
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

      {/* 3. Recent Activity Preview (Directs to full page) */}
      <div
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
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>

            </span>
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

        {/* Desktop Table View */}
        <div className="desktop-only" style={{ maxHeight: '360px', overflowY: 'auto', overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
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

        {/* Mobile Recent Requisitions Card List */}
        <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentRequisitions.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              No requisitions recorded yet.
            </div>
          ) : (
            recentRequisitions.map((r) => (
              <MobileRequisitionCard
                key={r.rsIndentNo}
                requisition={r}
                stageType="ALL"
                onOpenStageAction={onOpenStageAction}
                user={user}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
