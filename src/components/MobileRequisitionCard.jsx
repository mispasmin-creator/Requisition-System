import React from 'react';
import { motion } from 'framer-motion';
import { Paperclip, ExternalLink, ArrowRight, CheckCircle2, Clock, AlertTriangle, ChevronRight, FileText } from 'lucide-react';
import { StageBadge } from './StageBadge';

export function MobileRequisitionCard({
  requisition,
  stageType,
  filterMode,
  onOpenStageAction,
  user,
}) {
  const r = requisition;
  const isSuperAdmin = user?.isSuperAdmin || user?.role === 'admin' || user?.role === 'super_admin';

  const permKey = stageType ? stageType.toLowerCase() : null;
  const hasStagePerm = isSuperAdmin || (permKey && user?.permissions?.[permKey] && user?.permissions?.[permKey] !== 'No');

  // Determine if this card has an active pending action in the current stage
  let isPendingAction = false;
  let actionLabel = 'Action';

  if (stageType === 'APPROVAL') {
    isPendingAction = r.paidField === 'Hold' || !r.actualApproval;
    actionLabel = 'Review & Approve';
  } else if (stageType === 'POSTING') {
    isPendingAction = !r.actualPosting;
    actionLabel = 'Confirm Posting';
  } else if (stageType === 'PAYMENT') {
    isPendingAction = !r.actualPayment;
    actionLabel = 'Record Payment';
  } else if (stageType === 'AUDIT') {
    isPendingAction = !r.actualAudit;
    actionLabel = 'Audit Payment';
  } else if (stageType === 'TALLY') {
    isPendingAction = !r.actualTally;
    actionLabel = 'Tally Entry';
  }

  // Format amount
  const formattedAmount = Number(r.amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'INR',
  });

  const formattedApprovedAmt = r.approvedAmount
    ? Number(r.approvedAmount).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        style: 'currency',
        currency: 'INR',
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e5ede3',
        padding: '16px 18px',
        boxShadow: '0 4px 18px rgba(18, 36, 22, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar: RS Indent No + Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '4px 11px',
              borderRadius: '9999px',
              backgroundColor: '#1f3422',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              fontFamily: 'monospace',
            }}
          >
            {r.rsIndentNo || 'RS - ---'}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#687d6b', fontWeight: 600 }}>
            {r.date || ''}
          </span>
        </div>

        {/* Payment Mode Tag */}
        {r.mode && (
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '9999px',
              backgroundColor: '#eef5ec',
              color: '#2a472f',
              border: '1px solid #d4e5d1',
              textTransform: 'uppercase',
            }}
          >
            {r.mode}
          </span>
        )}
      </div>

      {/* Middle Row: Requester & Reason */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <h4
            style={{
              margin: 0,
              fontSize: '0.98rem',
              fontWeight: 700,
              color: '#142618',
              lineHeight: 1.25,
            }}
          >
            {r.requesterName || 'Unknown Requester'}
          </h4>
          {r.firmName && (
            <span
              style={{
                fontSize: '0.78rem',
                color: '#556b59',
                backgroundColor: '#f3f7f2',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {r.firmName}
            </span>
          )}
        </div>

        {r.reason && (
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: '0.85rem',
              color: '#4c6150',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {r.reason}
          </p>
        )}
      </div>

      {/* Financials & Attachment */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderRadius: '14px',
          backgroundColor: '#f8faf7',
          border: '1px solid #e7efe5',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.72rem', color: '#748b77', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
            Amount Requested
          </span>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#1a331e',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            {formattedAmount}
          </span>
          {formattedApprovedAmt && formattedApprovedAmt !== formattedAmount && (
            <span style={{ fontSize: '0.74rem', color: '#2a472f', fontWeight: 700, marginTop: '2px' }}>
              Approved: {formattedApprovedAmt}
            </span>
          )}
        </div>

        {r.attachmentUrl && (
          <a
            href={r.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="View Attachment"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '9999px',
              backgroundColor: '#ffffff',
              border: '1px solid #c8dcc5',
              color: '#2a472f',
              fontSize: '0.76rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(18, 36, 22, 0.05)',
            }}
          >
            <Paperclip size={13} />
            <span>File</span>
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Bottom Row: Stage Status Badge + Action Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          paddingTop: '4px',
        }}
      >
        {/* Stage Status Badge */}
        <div>
          {stageType === 'APPROVAL' && <StageBadge status={r.approvalStatus} />}
          {stageType === 'POSTING' && <StageBadge status={r.postingStatus} />}
          {stageType === 'PAYMENT' && <StageBadge status={r.paymentStatus} />}
          {stageType === 'AUDIT' && <StageBadge status={r.auditStatus} />}
          {stageType === 'TALLY' && <StageBadge status={r.tallyStatus} />}
          {(!stageType || stageType === 'ALL') && (
            <StageBadge status={r.overall || r.tallyStatus || r.auditStatus || r.paymentStatus || r.postingStatus || r.approvalStatus} />
          )}
        </div>

        {/* Action Button */}
        {hasStagePerm && isPendingAction && onOpenStageAction ? (
          <button
            type="button"
            onClick={() => onOpenStageAction(r, stageType)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '9999px',
              backgroundColor: '#1f3422',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(31, 52, 34, 0.25)',
              transition: 'transform 0.1s ease',
            }}
          >
            <span>{actionLabel}</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenStageAction?.(r, stageType || 'ALL')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '9999px',
              backgroundColor: '#f1f5ef',
              color: '#2a472f',
              border: '1px solid #d7e4d4',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Details</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
