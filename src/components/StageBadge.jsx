import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';

export function StageBadge({ status, label }) {
  const normStatus = (status || '').toUpperCase();

  let bg = 'var(--status-notstarted-bg)';
  let color = 'var(--status-notstarted-text)';
  let border = 'var(--status-notstarted-border)';
  let Icon = MinusCircle;
  let text = label || 'Not Started';

  if (normStatus === 'PENDING') {
    bg = 'var(--status-pending-bg)';
    color = 'var(--status-pending-text)';
    border = 'var(--status-pending-border)';
    Icon = Clock;
    text = label || 'Pending';
  } else if (normStatus === 'COMPLETED') {
    bg = 'var(--status-completed-bg)';
    color = 'var(--status-completed-text)';
    border = 'var(--status-completed-border)';
    Icon = CheckCircle2;
    text = label || 'Completed';
  } else if (normStatus === 'OVERDUE') {
    bg = 'var(--status-overdue-bg)';
    color = 'var(--status-overdue-text)';
    border = 'var(--status-overdue-border)';
    Icon = AlertTriangle;
    text = label || 'Overdue';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.8rem',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {text}
    </span>
  );
}
