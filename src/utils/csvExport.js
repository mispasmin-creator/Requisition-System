/**
 * Universal CSV Export Utility for Requisition System
 * Handles UTF-8 BOM encoding so Microsoft Excel opens it perfectly with all symbols and formatting.
 */

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ');
  // If string contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv(filename, headers, rows) {
  if (!rows || rows.length === 0) {
    alert('No data available to export.');
    return false;
  }

  // Header row
  const headerLine = headers.map((h) => escapeCsvField(h.label || h.key || h)).join(',');

  // Data rows
  const dataLines = rows.map((row) => {
    return headers
      .map((h) => {
        const val = typeof h.getter === 'function' ? h.getter(row) : row[h.key];
        return escapeCsvField(val);
      })
      .join(',');
  });

  // Prepend UTF-8 BOM for Excel compatibility
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Standard Requisition Columns Configuration for CSV Export
 */
export const REQUISITION_CSV_COLUMNS = [
  { key: 'rsIndentNo', label: 'RS-Indent No.' },
  { key: 'timestamp', label: 'Date / Timestamp' },
  { key: 'requesterName', label: 'Requester Name' },
  { key: 'firmName', label: 'Firm Name' },
  {
    key: 'amount',
    label: 'Requested Amount (₹)',
    getter: (r) => (r.amount !== undefined && r.amount !== null ? r.amount : ''),
  },
  { key: 'mode', label: 'Mode' },
  { key: 'paymentLocation', label: 'Payment Location' },
  { key: 'reason', label: 'Reason / Description' },
  { key: 'attachments', label: 'Drive Attachment Link' },
  // Approval
  { key: 'plannedApproval', label: 'Planned Approval' },
  { key: 'actualApproval', label: 'Actual Approval' },
  { key: 'delayApproval', label: 'Approval Delay' },
  {
    key: 'approvedAmount',
    label: 'Approved Amount (₹)',
    getter: (r) => (r.approvedAmount !== undefined && r.approvedAmount !== null ? r.approvedAmount : ''),
  },
  { key: 'paidField', label: 'Paid Approval (Yes/No)' },
  // Posting
  { key: 'plannedPosting', label: 'Planned Posting' },
  { key: 'actualPosting', label: 'Actual Posting' },
  { key: 'delayPosting', label: 'Posting Delay' },
  // Payment
  { key: 'plannedPayment', label: 'Planned Payment' },
  { key: 'actualPayment', label: 'Actual Payment' },
  { key: 'delayPayment', label: 'Payment Delay' },
  {
    key: 'paymentAttachment',
    label: 'Payment Proof / Attachment',
    getter: (r) => r.paymentAttachment || r.paymentProof || '',
  },
  // Audit
  { key: 'plannedAudit', label: 'Planned Audit' },
  { key: 'actualAudit', label: 'Actual Audit' },
  { key: 'delayAudit', label: 'Audit Delay' },
  // Tally
  { key: 'plannedTally', label: 'Planned Tally' },
  { key: 'actualTally', label: 'Actual Tally' },
  { key: 'delayTally', label: 'Tally Delay' },
  { key: 'remarks', label: 'Remarks / Notes' },
];

const DASHBOARD_CSV_COLUMNS = [
  { key: 'rsIndentNo', label: 'RS-Indent No.' },
  { key: 'timestamp', label: 'Date' },
  { key: 'requesterName', label: 'Requester' },
  { key: 'firmName', label: 'Firm Name' },
  { key: 'amount', label: 'Amount (₹)' },
  { key: 'mode', label: 'Mode' },
  {
    key: 'currentStageStatus',
    label: 'Current Stage Status',
    getter: (r) => {
      if (r.paidField === 'Rejected') return 'Rejected';
      if (!r.actualApproval) return 'Pending Approval';
      if (!r.actualPosting) return 'Pending Posting';
      if (!r.actualPayment) return 'Pending Payment';
      if (!r.actualAudit) return 'Pending Audit';
      if (!r.actualTally) return 'Pending Tally';
      return 'Completed';
    },
  },
];

const getStageStatus = (record, stageType) => {
  if (stageType === 'APPROVAL') {
    if (record.paidField === 'Rejected') return 'Rejected';
    if (record.paidField === 'Hold') return 'On Hold';
    return record.actualApproval ? 'Completed' : 'Pending';
  }
  if (stageType === 'POSTING') return record.actualPosting ? 'Completed' : 'Pending';
  if (stageType === 'PAYMENT') return record.actualPayment ? 'Completed' : 'Pending';
  if (stageType === 'AUDIT') return record.actualAudit ? 'Completed' : 'Pending';
  if (stageType === 'TALLY') return record.actualTally ? 'Completed' : 'Pending';
  if (record.paidField === 'Rejected') return 'Rejected';
  return record.actualTally ? 'Completed' : 'In Progress';
};

const STAGE_SCREEN_CSV_COLUMNS = [
  { key: 'rsIndentNo', label: 'RS-Indent No.' },
  { key: 'timestamp', label: 'Date' },
  { key: 'requesterName', label: 'Requester' },
  { key: 'firmName', label: 'Firm' },
  { key: 'amount', label: 'Amount (₹)' },
  { key: 'mode', label: 'Mode' },
  { key: 'reason', label: 'Reason' },
  { key: 'attachments', label: 'Attachment' },
];

export function getRequisitionCsvColumns(options = {}) {
  const { view = 'stage', stageType = 'ALL', filterMode = 'ALL' } = options;
  if (view === 'dashboard') return DASHBOARD_CSV_COLUMNS;

  const columns = [...STAGE_SCREEN_CSV_COLUMNS];
  if (stageType === 'APPROVAL' && filterMode === 'COMPLETED') {
    columns.splice(5, 0, { key: 'approvedAmount', label: 'Approved Amt (₹)' });
  }
  columns.push({
    key: 'stageStatus',
    label: 'Stage Status',
    getter: (record) => getStageStatus(record, stageType),
  });
  return columns;
}

/**
 * Standard User Columns Configuration for CSV Export
 */
export const USER_CSV_COLUMNS = [
  { key: 'id', label: 'User ID' },
  { key: 'username', label: 'Username' },
  { key: 'displayName', label: 'Display Name' },
  { key: 'role', label: 'Assigned Role' },
  { key: 'firmAccess', label: 'Firms Access', getter: (u) => (Array.isArray(u.firmAccess) ? u.firmAccess.join('; ') : u.firmAccess || 'All') },
  { key: 'isSuperAdmin', label: 'Super Admin', getter: (u) => (u.isSuperAdmin ? 'Yes' : 'No') },
  { key: 'createdAt', label: 'Created At' },
];

/**
 * Export Requisitions to CSV with customizable filename
 */
export function exportRequisitionsCsv(requisitions, stageTitle = 'Requisitions', filterSuffix = '', options = {}) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = (stageTitle || 'Requisitions').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanSuffix = filterSuffix ? `_${filterSuffix}` : '';
  const filename = `${cleanTitle}${cleanSuffix}_${dateStr}.csv`;
  return downloadCsv(filename, getRequisitionCsvColumns(options), requisitions);
}

/**
 * Export Users to CSV
 */
export function exportUsersCsv(users) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Users_Directory_${dateStr}.csv`;
  return downloadCsv(filename, USER_CSV_COLUMNS, users);
}
