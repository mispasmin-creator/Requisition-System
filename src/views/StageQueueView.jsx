import React, { useState } from 'react';
import { Search, Filter, CheckCircle2, Clock, AlertTriangle, ArrowRight, Paperclip, ExternalLink, Download } from 'lucide-react';
import { StageBadge } from '../components/StageBadge';
import { MobileRequisitionCard } from '../components/MobileRequisitionCard';
import { exportRequisitionsCsv } from '../utils/csvExport';
import { useIsMobile } from '../utils/useIsMobile';

export function StageQueueView({
  stageType, // 'APPROVAL' | 'POSTING' | 'PAYMENT' | 'AUDIT' | 'ALL'
  title,
  description,
  owner,
  requisitions = [],
  onOpenStageAction,
  user,
}) {
  const isMobile = useIsMobile(768);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('PENDING'); // 'PENDING' | 'COMPLETED' | 'ALL'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (mode) => {
    setFilterMode(mode);
    setCurrentPage(1);
  };

  const filtered = requisitions.filter((r) => {
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        (r.rsIndentNo && r.rsIndentNo.toLowerCase().includes(q)) ||
        (r.requesterName && r.requesterName.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)) ||
        (r.firmName && r.firmName.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (stageType === 'APPROVAL') {
      if (filterMode === 'PENDING') return r.paidField === 'Hold' || !r.actualApproval;
      if (filterMode === 'COMPLETED') return r.paidField !== 'Hold' && !!r.actualApproval;
    } else if (stageType === 'POSTING') {
      // Only an accepted approval can enter Posting. Hold/Rejected stop here.
      if (!r.actualApproval || r.paidField !== 'Yes') return false;
      if (filterMode === 'PENDING') return !r.actualPosting;
      if (filterMode === 'COMPLETED') return !!r.actualPosting;
    } else if (stageType === 'PAYMENT') {
      // Payment requires posting
      if (!r.actualPosting) return false;
      if (filterMode === 'PENDING') return !r.actualPayment;
      if (filterMode === 'COMPLETED') return !!r.actualPayment;
    } else if (stageType === 'AUDIT') {
      // Audit requires payment
      if (!r.actualPayment) return false;
      if (filterMode === 'PENDING') return !r.actualAudit;
      if (filterMode === 'COMPLETED') return !!r.actualAudit;
    } else if (stageType === 'TALLY') {
      // Tally requires audit completed
      if (!r.actualAudit) return false;
      if (filterMode === 'PENDING') return !r.actualTally;
      if (filterMode === 'COMPLETED') return !!r.actualTally;
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getActionBtnLabel = () => {
    switch (stageType) {
      case 'APPROVAL': return 'Review & Approve';
      case 'POSTING': return 'Confirm Posting';
      case 'PAYMENT': return 'Record Payment';
      case 'AUDIT': return 'Audit Payment';
      case 'TALLY': return 'Tally Entry';
      default: return 'Details';
    }
  };

  const handleExportCsv = () => {
    const suffix = stageType !== 'ALL' ? filterMode : 'All';
    exportRequisitionsCsv(filtered, title || stageType, suffix, {
      view: 'stage',
      stageType,
      filterMode,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '14px', height: isMobile ? 'auto' : '100%', minHeight: 0, flex: isMobile ? 'none' : 1 }}>
      {/* Stage Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? '8px' : '12px', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.18rem' : '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', marginBottom: 0 }}>
            {title}
          </h2>
          {description && description.trim() && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>{description}</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Status Mode Tabs */}
          {stageType !== 'ALL' && (
            <div
              style={{
                display: 'inline-flex',
                padding: '3px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-light)',
                gap: '3px',
              }}
            >
              {['PENDING', 'COMPLETED'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleFilterChange(mode)}
                  style={{
                    padding: isMobile ? '5px 12px' : '7px 16px',
                    borderRadius: 'var(--radius-pill)',
                    border: 'none',
                    backgroundColor: filterMode === mode ? 'var(--accent-sage-dark)' : 'transparent',
                    color: filterMode === mode ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: isMobile ? '0.78rem' : '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mode === 'PENDING' ? 'Pending Action' : 'Completed'}
                </button>
              ))}
            </div>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            title={`Export ${filtered.length} requisitions to CSV file`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 16px',
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
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.transform = 'translateY(0)';
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
              {filtered.length}
            </span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px',
          padding: isMobile ? '8px 14px' : '10px 18px',
          borderRadius: '14px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
          flexShrink: 0,
        }}
      >
        <Search size={17} color="var(--text-muted)" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={`Search in ${title}...`}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '0.92rem',
            color: 'var(--text-primary)',
          }}
        />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} Requisitions
        </span>
      </div>

      {/* Desktop Table View - Hidden on mobile screens */}
      <div
        className="desktop-only"
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
        {/* Scrollable table data with frozen sticky header */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>RS-Indent No.</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Date</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Requester</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Firm</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'right', whiteSpace: 'nowrap' }}>Amount</th>
                {stageType === 'APPROVAL' && filterMode === 'COMPLETED' && (
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'right', whiteSpace: 'nowrap' }}>Approved Amt</th>
                )}
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Mode</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Reason</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'center', whiteSpace: 'nowrap' }}>Attachment</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Stage Status</th>
                {stageType !== 'ALL' && (
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 16px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    No requisitions in this queue.
                  </td>
                </tr>
              ) : (
                paginated.map((r) => {
                  let isCurrentPending = false;
                  if (stageType === 'APPROVAL') isCurrentPending = r.paidField === 'Hold' || !r.actualApproval;
                  if (stageType === 'POSTING') isCurrentPending = r.actualApproval && r.paidField === 'Yes' && !r.actualPosting;
                  if (stageType === 'PAYMENT') isCurrentPending = r.actualPosting && !r.actualPayment;
                  if (stageType === 'AUDIT') isCurrentPending = r.actualPayment && !r.actualAudit;
                  if (stageType === 'TALLY') isCurrentPending = r.actualAudit && !r.actualTally;

                  return (
                    <tr
                      key={r.rsIndentNo}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.12s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(235, 243, 235, 0.45)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--accent-sage-dark)' }}>
                        {r.rsIndentNo}
                      </td>
                      <td style={{ padding: '11px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {r.timestamp}
                      </td>
                      <td style={{ padding: '11px 16px', fontWeight: 600 }}>{r.requesterName}</td>
                      <td style={{ padding: '11px 16px', color: 'var(--text-secondary)' }}>{r.firmName || '—'}</td>
                      <td style={{ padding: '11px 16px', color: 'var(--accent-sage-dark)' }} className="num-financial">
                        ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                      </td>
                      {stageType === 'APPROVAL' && filterMode === 'COMPLETED' && (
                        <td style={{ padding: '11px 16px', color: '#1b4d23' }} className="num-financial">
                          {r.approvedAmount ? `₹${Number(r.approvedAmount).toLocaleString('en-IN')}` : '—'}
                        </td>
                      )}
                      <td style={{ padding: '11px 16px', color: 'var(--text-muted)' }}>{r.mode}</td>
                      <td style={{ padding: '11px 16px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.reason}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {r.attachments ? (
                          <a
                            href={r.attachments}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open attached file from Google Drive"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 9px',
                              borderRadius: '6px',
                              backgroundColor: '#e0f2fe',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                              textDecoration: 'none',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Paperclip size={12} />
                            <span>File ↗</span>
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        {stageType === 'APPROVAL' && <StageBadge status={r.approvalStatus} />}
                        {stageType === 'POSTING' && <StageBadge status={r.postingStatus} />}
                        {stageType === 'PAYMENT' && <StageBadge status={r.paymentStatus} />}
                        {stageType === 'AUDIT' && <StageBadge status={r.auditStatus} />}
                        {stageType === 'TALLY' && <StageBadge status={r.tallyStatus} />}
                        {stageType === 'ALL' && <StageBadge status={r.overall} />}
                      </td>
                      {stageType !== 'ALL' && (
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {isCurrentPending ? (
                            (() => {
                              const permKey = stageType === 'APPROVAL' ? 'approval' :
                                              stageType === 'POSTING' ? 'posting' :
                                              stageType === 'PAYMENT' ? 'payment' :
                                              stageType === 'AUDIT' ? 'audit' :
                                              stageType === 'TALLY' ? 'tally' : null;
                              const isSuper =
                                user?.isSuperAdmin ||
                                user?.role === 'admin' ||
                                user?.role === 'super_admin' ||
                                user?.role === 'super admin' ||
                                user?.username?.toLowerCase() === 'admin';
                              const isViewOnly = !isSuper && user?.permissions && permKey && user.permissions[permKey] === 'View';

                              if (isViewOnly) {
                                return (
                                  <span
                                    title="You have View Only access for this stage"
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 'var(--radius-pill)',
                                      backgroundColor: 'var(--surface-subtle)',
                                      color: 'var(--text-muted)',
                                      border: '1px solid var(--border-light)',
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    View Only
                                  </span>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={() => onOpenStageAction(r, stageType)}
                                  style={{
                                    padding: '5px 13px',
                                    borderRadius: 'var(--radius-pill)',
                                    backgroundColor: 'var(--accent-sage-dark)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(42, 71, 47, 0.25)',
                                  }}
                                >
                                  {getActionBtnLabel()}
                                </button>
                              );
                            })()
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenStageAction(r, 'DETAILS')}
                              style={{
                                padding: '4px 11px',
                                borderRadius: 'var(--radius-pill)',
                                backgroundColor: '#edf5eb',
                                color: '#1f4023',
                                border: '1px solid #cce2ca',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - Fixed at bottom of Table Box */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '10px 18px',
              borderTop: '1px solid var(--border-light)',
              backgroundColor: 'var(--surface-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filtered.length)} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: currentPage === 1 ? '#f5f5f5' : '#ffffff',
                  color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: isCurrent ? 'none' : '1px solid var(--border-light)',
                      backgroundColor: isCurrent ? 'var(--accent-sage-dark)' : '#ffffff',
                      color: isCurrent ? '#ffffff' : 'var(--text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#ffffff',
                  color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card List View - Visible ONLY on mobile screens (inspired by reference image) */}
      <div
        className="mobile-only"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingBottom: '24px',
          touchAction: 'pan-y',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e5ede3',
              color: 'var(--text-muted)',
              boxShadow: '0 2px 10px rgba(18, 36, 22, 0.04)',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#1f3422' }}>No requisitions in this queue</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#687d6b' }}>All tasks are up to date.</p>
          </div>
        ) : (
          paginated.map((r, idx) => (
            <MobileRequisitionCard
              key={r.rsIndentNo || idx}
              requisition={r}
              stageType={stageType}
              filterMode={filterMode}
              onOpenStageAction={onOpenStageAction}
              user={user}
            />
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5ede3',
              boxShadow: '0 2px 8px rgba(18, 36, 22, 0.04)',
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid var(--border-light)',
                backgroundColor: currentPage === 1 ? '#f5f5f5' : '#ffffff',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>

            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid var(--border-light)',
                backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#ffffff',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
