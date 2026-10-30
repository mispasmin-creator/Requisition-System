import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  Send,
  DollarSign,
  ShieldCheck,
  BookCheck,
} from 'lucide-react';
import { useIsMobile } from '../utils/useIsMobile';

const STAGE_ICONS = {
  approval: CheckSquare,
  posting: Send,
  payment: DollarSign,
  audit: ShieldCheck,
  tally: BookCheck,
};

export function StatCard({
  stageName,
  stageKey,
  counters = { pending: 0, completed: 0, overdue: 0 },
  activeFilter,
  onSelectFilter,
  onNavigate,
}) {
  const isMobile = useIsMobile(768);
  const hasAnimatedRef = useRef(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!hasAnimatedRef.current && (counters.pending > 0 || counters.completed > 0 || counters.overdue > 0)) {
      hasAnimatedRef.current = true;
      setAnimated(true);
    }
  }, [counters]);

  const total = counters.pending + counters.completed + counters.overdue;
  const StageIcon = STAGE_ICONS[stageKey] || CheckSquare;

  // Professional Compact Mobile View
  if (isMobile) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate?.(stageKey)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '11px 13px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(18, 36, 22, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          gridColumn: stageKey === 'tally' ? 'span 2' : 'span 1',
        }}
      >
        {/* Subtle accent corner glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40px',
            height: '40px',
            background: 'radial-gradient(circle at top right, var(--accent-mint) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top: Icon + Stage Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              backgroundColor: 'var(--accent-mint-light)',
              color: 'var(--accent-sage-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <StageIcon size={14} strokeWidth={2.4} />
          </div>
          <span
            style={{
              fontSize: '0.80rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {stageName}
          </span>
        </div>

        {/* Metrics: Big Pending Number + Done Count */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span
              className="num-financial"
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: counters.pending > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                lineHeight: 1,
              }}
            >
              {counters.pending}
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: counters.pending > 0 ? 'var(--status-pending-text)' : 'var(--text-muted)',
                backgroundColor: counters.pending > 0 ? 'var(--status-pending-bg)' : 'var(--surface-subtle)',
                padding: '1px 5px',
                borderRadius: '5px',
              }}
            >
              Pending
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-sage-dark)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {counters.completed} done
            </span>
            <ArrowRight size={12} strokeWidth={2.2} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-card)',
        padding: '14px 16px',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: '118px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative subtle mint corner badge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '55px',
          height: '55px',
          background: 'radial-gradient(circle at top right, var(--accent-mint) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Stage Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <h3
          style={{
            fontSize: '1.02rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            minHeight: '2.35rem',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {stageName}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--accent-mint-subtle)',
              border: '1px solid var(--accent-mint)',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--accent-sage-dark)',
              whiteSpace: 'nowrap',
            }}
          >
            {total} Active
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(stageKey)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-sage-dark)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.70rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <span>Open Page</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Metric Counters Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {/* Pending */}
        <button
          type="button"
          onClick={() => onSelectFilter?.(stageKey, 'PENDING')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '6px 4px',
            borderRadius: '10px',
            backgroundColor: activeFilter?.stage === stageKey && activeFilter?.status === 'PENDING'
              ? 'var(--accent-sage)'
              : 'var(--status-pending-bg)',
            color: activeFilter?.stage === stageKey && activeFilter?.status === 'PENDING'
              ? '#ffffff'
              : 'var(--status-pending-text)',
            border: `1px solid ${
              activeFilter?.stage === stageKey && activeFilter?.status === 'PENDING'
                ? 'var(--accent-sage-dark)'
                : 'var(--status-pending-border)'
            }`,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.70rem', fontWeight: 600 }}>
            <Clock size={11} /> Pending
          </div>
          <span
            className="num-financial"
            style={{
              fontSize: '1.08rem',
              fontWeight: 700,
              marginTop: '2px',
            }}
          >
            {counters.pending}
          </span>
        </button>

        {/* Completed */}
        <button
          type="button"
          onClick={() => onSelectFilter?.(stageKey, 'COMPLETED')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '6px 4px',
            borderRadius: '10px',
            backgroundColor: activeFilter?.stage === stageKey && activeFilter?.status === 'COMPLETED'
              ? 'var(--accent-sage)'
              : 'var(--status-completed-bg)',
            color: activeFilter?.stage === stageKey && activeFilter?.status === 'COMPLETED'
              ? '#ffffff'
              : 'var(--status-completed-text)',
            border: `1px solid ${
              activeFilter?.stage === stageKey && activeFilter?.status === 'COMPLETED'
                ? 'var(--accent-sage-dark)'
                : 'var(--status-completed-border)'
            }`,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.70rem', fontWeight: 600 }}>
            <CheckCircle2 size={11} /> Completed
          </div>
          <span
            className="num-financial"
            style={{
              fontSize: '1.08rem',
              fontWeight: 700,
              marginTop: '2px',
            }}
          >
            {counters.completed}
          </span>
        </button>

        {/* Overdue */}
        <button
          type="button"
          onClick={() => onSelectFilter?.(stageKey, 'OVERDUE')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '6px 4px',
            borderRadius: '10px',
            backgroundColor: activeFilter?.stage === stageKey && activeFilter?.status === 'OVERDUE'
              ? 'var(--status-overdue-text)'
              : 'var(--status-overdue-bg)',
            color: activeFilter?.stage === stageKey && activeFilter?.status === 'OVERDUE'
              ? '#ffffff'
              : 'var(--status-overdue-text)',
            border: `1px solid ${
              activeFilter?.stage === stageKey && activeFilter?.status === 'OVERDUE'
                ? 'var(--status-overdue-text)'
                : 'var(--status-overdue-border)'
            }`,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.70rem', fontWeight: 600 }}>
            <AlertTriangle size={11} /> Overdue
          </div>
          <span
            className="num-financial"
            style={{
              fontSize: '1.08rem',
              fontWeight: 700,
              marginTop: '2px',
            }}
          >
            {counters.overdue}
          </span>
        </button>
      </div>
    </motion.div>
  );
}
