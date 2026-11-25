import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  PlusCircle,
  Paperclip,
  Building2,
  User,
  RotateCcw,
  Check,
  Clock,
  PauseCircle,
  XCircle,
  Eye,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';
import { StageBadge } from '../components/StageBadge';
import { exportRequisitionsCsv, getRequisitionReachedStage } from '../utils/csvExport';
import { NewRequisitionModal } from './NewRequisitionModal';
import { useIsMobile } from '../utils/useIsMobile';

const PIPELINE_STEPS = [
  { key: 'approval', short: 'Appr', title: '1. Management Approval' },
  { key: 'posting', short: 'Post', title: '2. Posting' },
  { key: 'payment', short: 'Pay', title: '3. Get Payment' },
  { key: 'audit', short: 'Audit', title: '4. Audit Payments' },
  { key: 'tally', short: 'Tally', title: '5. Tally Entry' },
];

function PipelineTracker({ requisition }) {
  const reached = getRequisitionReachedStage(requisition);
  const timestamps = {
    approval: requisition.actualApproval,
    posting: requisition.actualPosting,
    payment: requisition.actualPayment,
    audit: requisition.actualAudit,
    tally: requisition.actualTally,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {PIPELINE_STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const ts = timestamps[step.key];
        const isRejectedHere = reached.stageKey === 'REJECTED' && stepNumber === 1;
        const isHoldHere = reached.stageKey === 'HOLD' && stepNumber === 1;
        const isDone = !isRejectedHere && !isHoldHere && (reached.step > stepNumber || (reached.step === 6));
        const isCurrent = !isRejectedHere && !isHoldHere && reached.step === stepNumber;

        let bg = '#eef2ee';
        let color = '#7c8d7e';
        let border = '#dce5dc';
        let icon = null;

        if (isRejectedHere) {
          bg = '#fef2f2';
          color = '#b91c1c';
          border = '#fecaca';
          icon = <XCircle size={10} strokeWidth={2.5} />;
        } else if (isHoldHere) {
          bg = '#fff7ed';
          color = '#9a3412';
          border = '#fdba74';
          icon = <PauseCircle size={10} strokeWidth={2.5} />;
        } else if (isDone) {
          bg = '#d7eed3';
          color = '#144917';
          border = '#99d194';
          icon = <Check size={10} strokeWidth={2.8} />;
        } else if (isCurrent) {
          bg = reached.status === 'OVERDUE' ? '#fde8e7' : '#fef3e7';
          color = reached.status === 'OVERDUE' ? '#8e1f1a' : '#8a4d10';
          border = reached.status === 'OVERDUE' ? '#f7b5b1' : '#f3cf9d';
          icon = <Clock size={10} strokeWidth={2.5} />;
        }

        return (
          <React.Fragment key={step.key}>
            <span
              title={`${step.title}${ts ? ` (${ts})` : isCurrent ? ' (Current Stage)' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: bg,
                color,
                border: `1px solid ${border}`,
                fontSize: '0.68rem',
                fontWeight: isDone || isCurrent || isRejectedHere || isHoldHere ? 700 : 600,
                whiteSpace: 'nowrap',
              }}
            >
              {icon}
              <span>{step.short}</span>
            </span>
            {index < PIPELINE_STEPS.length - 1 && (
              <span style={{ color: isDone ? '#6b9466' : '#c7d3c6', fontSize: '0.68rem', fontWeight: 700 }}>
                ›
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function RequisitionsView({
  requisitions = [],
  onOpenStageAction,
  onRequisitionCreated,
}) {
  const isMobile = useIsMobile(768);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFirm, setSelectedFirm] = useState('');
  const [selectedRequester, setSelectedRequester] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { data: masterDropdowns } = useQuery({
    queryKey: ['master-dropdowns'],
    queryFn: () => api.getMasterDropdowns(),
    staleTime: 300000,
  });

  // Combine Master dropdown options with any values present in requisitions
  const firmOptions = useMemo(() => {
    const set = new Set();
    (masterDropdowns?.firmNames || []).forEach((f) => f && set.add(f.trim()));
    requisitions.forEach((r) => {
      if (r.firmName && r.firmName.trim()) set.add(r.firmName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterDropdowns, requisitions]);

  const requesterOptions = useMemo(() => {
    const set = new Set();
    (masterDropdowns?.requesters || []).forEach((req) => req && set.add(req.trim()));
    requisitions.forEach((r) => {
      if (r.requesterName && r.requesterName.trim()) set.add(r.requesterName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterDropdowns, requisitions]);

  const filtered = useMemo(() => {
    return requisitions.filter((r) => {
      if (selectedFirm) {
        if ((r.firmName || '').trim().toLowerCase() !== selectedFirm.trim().toLowerCase()) {
          return false;
        }
      }

      if (selectedRequester) {
        if ((r.requesterName || '').trim().toLowerCase() !== selectedRequester.trim().toLowerCase()) {
          return false;
        }
      }

      if (selectedStage !== 'ALL') {
        const reached = getRequisitionReachedStage(r);
        if (reached.stageKey !== selectedStage) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const reached = getRequisitionReachedStage(r);
        const matches =
          (r.rsIndentNo && r.rsIndentNo.toLowerCase().includes(q)) ||
          (r.requesterName && r.requesterName.toLowerCase().includes(q)) ||
          (r.firmName && r.firmName.toLowerCase().includes(q)) ||
          (r.reason && r.reason.toLowerCase().includes(q)) ||
          (r.paymentLocation && r.paymentLocation.toLowerCase().includes(q)) ||
          (r.mode && r.mode.toLowerCase().includes(q)) ||
          (r.remarks && r.remarks.toLowerCase().includes(q)) ||
          reached.label.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [requisitions, selectedFirm, selectedRequester, selectedStage, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasActiveFilters = Boolean(
    selectedFirm || selectedRequester || selectedStage !== 'ALL' || searchTerm.trim()
  );

  const handleResetFilters = () => {
    setSelectedFirm('');
    setSelectedRequester('');
    setSelectedStage('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    const suffixParts = [];
    if (selectedFirm) suffixParts.push(selectedFirm);
    if (selectedRequester) suffixParts.push(selectedRequester);
    if (selectedStage !== 'ALL') suffixParts.push(selectedStage);
    const suffix = suffixParts.length > 0 ? suffixParts.join('_') : 'All';
    exportRequisitionsCsv(filtered, 'Requisitions', suffix, { view: 'requisitions' });
  };

  // Compact page numbers window
  const visiblePageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, safePage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '10px' : '14px',
        height: isMobile ? 'auto' : '100%',
        minHeight: 0,
        flex: isMobile ? 'none' : 1,
      }}
    >
      {/* Page Header with Export CSV & Requisition Form Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: isMobile ? '10px' : '12px',
          padding: isMobile ? '12px 14px' : '14px 18px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: isMobile ? '1.15rem' : '1.4rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Requisitions
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Complete requisition data &amp; live stage tracking ({filtered.length} of {requisitions.length} records)
          </p>
        </div>

        {/* Header Action Buttons: Export CSV + Requisition Form */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            title={`Export ${filtered.length} requisitions to CSV file`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: isMobile ? '7px 13px' : '8px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-strong)',
              color: 'var(--accent-sage-dark)',
              fontSize: isMobile ? '0.8rem' : '0.84rem',
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
              {filtered.length}
            </span>
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setIsFormOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '8px 15px' : '9px 18px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--accent-sage)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: isMobile ? '0.82rem' : '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(136, 163, 131, 0.35)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-sage-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-sage)')}
          >
            <PlusCircle size={17} strokeWidth={2.4} />
            <span>Requisition Form</span>
          </motion.button>
        </div>
      </div>

      {/* Filters Bar: Search + Firm Name Dropdown + Requester Dropdown + Current Stage Dropdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(200px, 1.4fr) minmax(170px, 1fr) minmax(170px, 1fr) minmax(170px, 1fr) auto',
          gap: '10px',
          alignItems: 'center',
          padding: isMobile ? '10px 12px' : '11px 16px',
          borderRadius: '14px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
          flexShrink: 0,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--surface-subtle)',
            border: '1px solid var(--border-light)',
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search RS No, reason, remarks..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.86rem',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Firm Name Dropdown Filter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 10px',
            borderRadius: '10px',
            backgroundColor: selectedFirm ? 'var(--accent-mint-light)' : 'var(--surface-subtle)',
            border: selectedFirm ? '1px solid var(--accent-sage)' : '1px solid var(--border-light)',
          }}
        >
          <Building2 size={15} color="var(--accent-sage-dark)" style={{ flexShrink: 0 }} />
          <select
            aria-label="Filter by Firm Name"
            value={selectedFirm}
            onChange={(e) => {
              setSelectedFirm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.85rem',
              fontWeight: selectedFirm ? 700 : 500,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="">All Firms</option>
            {firmOptions.map((firm) => (
              <option key={firm} value={firm}>
                {firm}
              </option>
            ))}
          </select>
        </div>

        {/* Requester Dropdown Filter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 10px',
            borderRadius: '10px',
            backgroundColor: selectedRequester ? 'var(--accent-mint-light)' : 'var(--surface-subtle)',
            border: selectedRequester ? '1px solid var(--accent-sage)' : '1px solid var(--border-light)',
          }}
        >
          <User size={15} color="var(--accent-sage-dark)" style={{ flexShrink: 0 }} />
          <select
            aria-label="Filter by Requester"
            value={selectedRequester}
            onChange={(e) => {
              setSelectedRequester(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.85rem',
              fontWeight: selectedRequester ? 700 : 500,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="">All Requesters</option>
            {requesterOptions.map((req) => (
              <option key={req} value={req}>
                {req}
              </option>
            ))}
          </select>
        </div>

        {/* Current Stage Dropdown Filter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 10px',
            borderRadius: '10px',
            backgroundColor: selectedStage !== 'ALL' ? 'var(--accent-mint-light)' : 'var(--surface-subtle)',
            border: selectedStage !== 'ALL' ? '1px solid var(--accent-sage)' : '1px solid var(--border-light)',
          }}
        >
          <Layers size={15} color="var(--accent-sage-dark)" style={{ flexShrink: 0 }} />
          <select
            aria-label="Filter by Current Stage"
            value={selectedStage}
            onChange={(e) => {
              setSelectedStage(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.85rem',
              fontWeight: selectedStage !== 'ALL' ? 700 : 500,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Stages</option>
            <option value="APPROVAL">1. Management Approval</option>
            <option value="POSTING">2. Posting</option>
            <option value="PAYMENT">3. Get Payment</option>
            <option value="AUDIT">4. Audit Payments</option>
            <option value="TALLY">5. Tally Entry</option>
            <option value="COMPLETED">Completed</option>
            <option value="HOLD">On Hold</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            title="Clear all filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '7px 12px',
              borderRadius: '10px',
              backgroundColor: '#fde8e7',
              border: '1px solid #f7b5b1',
              color: '#8e1f1a',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Desktop Complete Data Table */}
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
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>RS-Indent No.</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Date</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Requester</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Firm Name</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'right', whiteSpace: 'nowrap' }}>Req. Amt</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'right', whiteSpace: 'nowrap' }}>Appr. Amt</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Mode</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Location</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Reason</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'center', whiteSpace: 'nowrap' }}>Files</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Stage Progress</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', whiteSpace: 'nowrap' }}>Reached At (Current Stage)</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f4f7f3', padding: '12px 14px', fontWeight: 700, borderBottom: '2px solid var(--border-light)', textAlign: 'center', whiteSpace: 'nowrap' }}>View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    {hasActiveFilters
                      ? 'No requisitions match the selected Firm / Requester filters.'
                      : 'No requisitions recorded yet.'}
                  </td>
                </tr>
              ) : (
                paginated.map((r) => {
                  const reached = getRequisitionReachedStage(r);
                  const paymentProof = r.paymentAttachment || r.paymentProof;
                  return (
                    <tr
                      key={r.rsIndentNo}
                      onClick={() => onOpenStageAction?.(r, 'DETAILS')}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.12s ease', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(235, 243, 235, 0.45)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--accent-sage-dark)', whiteSpace: 'nowrap' }}>
                        {r.rsIndentNo}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {r.timestamp}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {r.requesterName}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {r.firmName || '—'}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--accent-sage-dark)', whiteSpace: 'nowrap' }} className="num-financial">
                        ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#1b4d23', whiteSpace: 'nowrap' }} className="num-financial">
                        {r.approvedAmount ? `₹${Number(r.approvedAmount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {r.mode || '—'}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {r.paymentLocation || '—'}
                      </td>
                      <td
                        style={{ padding: '11px 14px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={[r.reason, r.chequeDetails ? `Cheque: ${r.chequeDetails}` : ''].filter(Boolean).join(' | ')}
                      >
                        {r.reason || '—'}
                        {r.chequeDetails ? ` • Cheque: ${r.chequeDetails}` : ''}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {r.attachments && (
                            <a
                              href={r.attachments}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Bill/Invoice Attachment"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 7px',
                                borderRadius: '6px',
                                backgroundColor: '#e0f2fe',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                textDecoration: 'none',
                                fontSize: '0.73rem',
                                fontWeight: 600,
                              }}
                            >
                              <Paperclip size={11} />
                              <span>Bill</span>
                            </a>
                          )}
                          {r.chequeImage && r.chequeImage !== r.attachments && (
                            <a
                              href={r.chequeImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Cheque Image"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 7px',
                                borderRadius: '6px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                textDecoration: 'none',
                                fontSize: '0.73rem',
                                fontWeight: 600,
                              }}
                            >
                              <Paperclip size={11} />
                              <span>Cheque</span>
                            </a>
                          )}
                          {paymentProof && (
                            <a
                              href={paymentProof}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Payment Proof"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 7px',
                                borderRadius: '6px',
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                textDecoration: 'none',
                                fontSize: '0.73rem',
                                fontWeight: 600,
                              }}
                            >
                              <Paperclip size={11} />
                              <span>Pay</span>
                            </a>
                          )}
                          {!r.attachments && !r.chequeImage && !paymentProof && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <PipelineTracker requisition={r} />
                      </td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <StageBadge status={reached.status} label={reached.label} />
                          {reached.detail && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                              {reached.detail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onOpenStageAction?.(r, 'DETAILS')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 11px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: '#edf5eb',
                            color: '#1f4023',
                            border: '1px solid #cce2ca',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
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
              Showing {Math.min((safePage - 1) * pageSize + 1, filtered.length)} to{' '}
              {Math.min(safePage * pageSize, filtered.length)} of {filtered.length} entries
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: safePage === 1 ? '#f5f5f5' : '#ffffff',
                  color: safePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>

              {visiblePageNumbers.map((pageNum) => {
                const isCurrent = pageNum === safePage;
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
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: safePage === totalPages ? '#f5f5f5' : '#ffffff',
                  color: safePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards View */}
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
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              border: '1px solid #e5ede3',
              color: 'var(--text-muted)',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#1f3422' }}>
              No requisitions found
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#687d6b' }}>
              {hasActiveFilters ? 'Try clearing or changing your filters.' : 'Create one using Requisition Form above.'}
            </p>
          </div>
        ) : (
          paginated.map((r, idx) => {
            const reached = getRequisitionReachedStage(r);
            return (
              <motion.div
                key={r.rsIndentNo || idx}
                whileTap={{ scale: 0.99 }}
                onClick={() => onOpenStageAction?.(r, 'DETAILS')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '15px',
                  padding: '12px 14px',
                  border: '1px solid #e7efe5',
                  boxShadow: '0 2px 7px rgba(18, 36, 22, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: '6px',
                        backgroundColor: '#1f3422',
                        color: '#ffffff',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                      }}
                    >
                      {r.rsIndentNo}
                    </span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#162b1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.requesterName}
                    </span>
                  </div>
                  <span className="num-financial" style={{ fontSize: '0.98rem', fontWeight: 800, color: '#162b1a' }}>
                    ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#5b725e', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {r.firmName && <strong>{r.firmName}</strong>}
                  {r.timestamp && <span>• {r.timestamp}</span>}
                  {r.mode && <span>• {r.mode}</span>}
                  {r.paymentLocation && <span>• {r.paymentLocation}</span>}
                </div>

                {r.reason && (
                  <div style={{ fontSize: '0.76rem', color: '#485c4c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.reason}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', paddingTop: '4px', borderTop: '1px dashed #e7efe5' }}>
                  <PipelineTracker requisition={r} />
                  <StageBadge status={reached.status} label={reached.label} />
                </div>
              </motion.div>
            );
          })
        )}

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
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: '1px solid var(--border-light)',
                backgroundColor: safePage === 1 ? '#f5f5f5' : '#ffffff',
                color: safePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: '1px solid var(--border-light)',
                backgroundColor: safePage === totalPages ? '#f5f5f5' : '#ffffff',
                color: safePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Requisition Form Modal - Rendered ONLY inside this page */}
      <NewRequisitionModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          onRequisitionCreated?.();
        }}
      />
    </div>
  );
}
