import React from 'react';
import { motion } from 'framer-motion';
import { Paperclip, ArrowRight, ChevronRight } from 'lucide-react';

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
    actionLabel = 'Approve';
  } else if (stageType === 'POSTING') {
    isPendingAction = !r.actualPosting;
    actionLabel = 'Confirm';
  } else if (stageType === 'PAYMENT') {
    isPendingAction = !r.actualPayment;
    actionLabel = 'Record Pay';
  } else if (stageType === 'AUDIT') {
    isPendingAction = !r.actualAudit;
    actionLabel = 'Audit';
  } else if (stageType === 'TALLY') {
    isPendingAction = !r.actualTally;
    actionLabel = 'Tally Done';
  }

  // Format currency
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

  // Compute status badge
  let stageBadge = { label: 'Pending', bg: '#fef3e7', color: '#8a4d10' };
  if (stageType === 'APPROVAL') {
    stageBadge = r.actualApproval
      ? (r.paidField === 'Hold' ? { label: 'On Hold', bg: '#fef3e7', color: '#8a4d10' } : { label: 'Approved', bg: '#d7eed3', color: '#144917' })
      : { label: 'Pending', bg: '#fef3e7', color: '#8a4d10' };
  } else if (stageType === 'POSTING') {
    stageBadge = r.actualPosting ? { label: 'Posted', bg: '#d7eed3', color: '#144917' } : { label: 'Pending', bg: '#fef3e7', color: '#8a4d10' };
  } else if (stageType === 'PAYMENT') {
    stageBadge = r.actualPayment ? { label: 'Paid', bg: '#d7eed3', color: '#144917' } : { label: 'Pending', bg: '#fef3e7', color: '#8a4d10' };
  } else if (stageType === 'AUDIT') {
    stageBadge = r.actualAudit ? { label: 'Audited', bg: '#d7eed3', color: '#144917' } : { label: 'Pending', bg: '#fef3e7', color: '#8a4d10' };
  } else if (stageType === 'TALLY') {
    stageBadge = r.actualTally ? { label: 'Tally Done', bg: '#d7eed3', color: '#144917' } : { label: 'Pending', bg: '#fef3e7', color: '#8a4d10' };
  } else {
    // Stage ALL / History
    if (!r.actualApproval) stageBadge = { label: 'Pending Approval', bg: '#fef3e7', color: '#8a4d10' };
    else if (!r.actualPosting) stageBadge = { label: 'Pending Posting', bg: '#fef3e7', color: '#8a4d10' };
    else if (!r.actualPayment) stageBadge = { label: 'Pending Payment', bg: '#fef3e7', color: '#8a4d10' };
    else if (!r.actualAudit) stageBadge = { label: 'Pending Audit', bg: '#fef3e7', color: '#8a4d10' };
    else if (!r.actualTally) stageBadge = { label: 'Pending Tally', bg: '#eef5ec', color: '#254228' };
    else stageBadge = { label: 'Completed', bg: '#d7eed3', color: '#144917' };
  }

  // Handler for card clicks: always open read-only Details if in Completed tab or if stage action is already finished
  const handleCardClick = () => {
    if (filterMode === 'COMPLETED' || !isPendingAction || !hasStagePerm || stageType === 'ALL') {
      onOpenStageAction?.(r, 'DETAILS');
    } else {
      onOpenStageAction?.(r, stageType);
    }
  };

  const attachmentLink = r.attachments || r.attachmentUrl;

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={handleCardClick}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '15px',
        padding: '11px 13px',
        border: '1px solid #e7efe5',
        boxShadow: '0 2px 7px rgba(18, 36, 22, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.15s ease',
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Top Row: RS No + Requester + Amount */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '6px',
              backgroundColor: '#1f3422',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              letterSpacing: '0.02em',
              flexShrink: 0,
            }}
          >
            {r.rsIndentNo || 'RS - ---'}
          </span>

          <span
            style={{
              fontSize: '0.86rem',
              fontWeight: 800,
              color: '#162b1a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {r.requesterName || 'Unknown'}
          </span>

          {r.firmName && (
            <span
              style={{
                fontSize: '0.70rem',
                color: '#5b725e',
                backgroundColor: '#f1f6ef',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {r.firmName}
            </span>
          )}
        </div>

        {/* Amount */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
          <span
            className="num-financial"
            style={{
              fontSize: '1.02rem',
              fontWeight: 800,
              color: '#162b1a',
              lineHeight: 1.1,
            }}
          >
            {formattedAmount}
          </span>
          {formattedApprovedAmt && formattedApprovedAmt !== formattedAmount && (
            <span style={{ fontSize: '0.66rem', color: '#166534', fontWeight: 700 }}>
              Appr: {formattedApprovedAmt}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row: Metadata (Date, Mode, Reason) + Status Badge / Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: '0.72rem', color: '#68806b', whiteSpace: 'nowrap' }}>
            {r.date || ''}
          </span>

          {r.mode && (
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: '#f3f6f2',
                color: '#344b37',
                border: '1px solid #dbe6da',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {r.mode}
            </span>
          )}

          {r.reason && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#5a6e5d',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={r.reason}
            >
              • {r.reason}
            </span>
          )}

          {attachmentLink && (
            <a
              href={attachmentLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open Attachment in Drive"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                color: 'var(--accent-sage-dark)',
                fontSize: '0.68rem',
                fontWeight: 700,
                textDecoration: 'none',
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: '#edf5eb',
              }}
            >
              <Paperclip size={11} />
              <span>File</span>
            </a>
          )}
        </div>

        {/* Right: Action Button or Status Badge + Details Option */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '9999px',
              backgroundColor: stageBadge.bg,
              color: stageBadge.color,
              whiteSpace: 'nowrap',
            }}
          >
            {stageBadge.label}
          </span>

          {/* Pending Action Mode: Action Button */}
          {filterMode === 'PENDING' && hasStagePerm && isPendingAction && stageType !== 'ALL' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenStageAction(r, stageType);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: '#1f3422',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(31, 52, 34, 0.2)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{actionLabel}</span>
              <ArrowRight size={11} strokeWidth={2.4} />
            </button>
          ) : (
            /* Completed / Read-Only Mode: Details View Pill */
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenStageAction?.(r, 'DETAILS');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '3px 8px',
                borderRadius: '9999px',
                backgroundColor: '#edf5eb',
                color: '#1f4023',
                border: '1px solid #cce2ca',
                fontSize: '0.70rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Details</span>
              <ChevronRight size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
