import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3001,
  SPREADSHEET_ID: process.env.SPREADSHEET_ID || '1yfiavHpqcvXZYL4OYRtGcu1tdL_YJIxL8vDH83ErDZI',
  DATA_TAB: process.env.DATA_TAB || 'FMS',
  MASTER_TAB: process.env.MASTER_TAB || 'Master',
  LOGIN_TAB: process.env.LOGIN_TAB || 'Login page',
  HEADER_ROW: 6,
  DATA_START_ROW: 7,
  WORKFLOW_CONFIG_ROWS: [1, 2, 3, 4, 5],
  TIMEZONE: 'Asia/Kolkata',

  // Google Drive folder for uploads (images, PDFs)
  DRIVE_FOLDER_ID: process.env.DRIVE_FOLDER_ID || '1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR',
  DRIVE_FOLDER_URL: process.env.DRIVE_FOLDER_URL || 'https://drive.google.com/drive/folders/1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR?lfhs=2',

  // Google Apps Script Web App Endpoint for direct sheet writes
  APPS_SCRIPT_URL: process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwLT8Ha6mrv9sP2cX2DFfu1R9g1sypq-pMU_hLNB_uE5ayunDOGmoAa5naVdJIDlKmT/exec',

  // Column definitions for 'Login page' tab
  LOGIN_COLUMNS: {
    A: 'Full Name',
    B: 'User',
    C: 'Role',
    D: 'Password',
    E: 'Status',
    F: 'Firm Access',
    G: 'Dashboard',
    H: 'Management Approval',
    I: 'Posting',
    J: 'Get Payment',
    K: 'Audit Payments',
    L: 'All Records',
    M: 'Administration',
    N: 'Tally Entry',
  },

  // Canonical column schema mapping matching live sheet Row 6
  CANONICAL_COLUMNS: {
    A: { name: 'Timestamp', formulaProtected: false },
    B: { name: 'RS-Indent No.', formulaProtected: false },
    C: { name: 'Name Of The Requester', formulaProtected: false },
    D: { name: 'Description', formulaProtected: false }, // Firm Name / Description
    E: { name: 'Amount', formulaProtected: false },
    F: { name: 'Mode', formulaProtected: false },
    G: { name: 'Payment Location', formulaProtected: false },
    H: { name: 'Reason', formulaProtected: false },
    I: { name: 'Any Attchments', formulaProtected: false },
    J: { name: 'Planned', formulaProtected: true, stage: 'Management Approval' },
    K: { name: 'Actual', formulaProtected: false, stage: 'Management Approval' },
    L: { name: 'Delay', formulaProtected: true, stage: 'Management Approval' },
    M: { name: 'Paid', formulaProtected: false, stage: 'Management Approval' },
    N: { name: 'Approved Amount', formulaProtected: false, stage: 'Management Approval' },
    O: { name: 'Planned 2', formulaProtected: true, stage: 'Posting' },
    P: { name: 'Actual 2', formulaProtected: false, stage: 'Posting' },
    Q: { name: 'Delay 2', formulaProtected: true, stage: 'Posting' },
    R: { name: 'Planned 3', formulaProtected: true, stage: 'Get Payment' },
    S: { name: 'Actual 3', formulaProtected: false, stage: 'Get Payment' },
    T: { name: 'Delay 3', formulaProtected: true, stage: 'Get Payment' },
    U: { name: 'Attachment', formulaProtected: false, stage: 'Get Payment' },
    V: { name: 'Planned 4', formulaProtected: true, stage: 'Audit Payments' },
    W: { name: 'Actual 4', formulaProtected: false, stage: 'Audit Payments' },
    X: { name: 'Delay 4', formulaProtected: true, stage: 'Audit Payments' },
    Y: { name: 'Remark', formulaProtected: false },
    Z: { name: 'Planned 5', formulaProtected: true, stage: 'Tally Entry' },
    AA: { name: 'Actual 5', formulaProtected: false, stage: 'Tally Entry' },
    AB: { name: 'Delay 5', formulaProtected: true, stage: 'Tally Entry' },
  },

  // Planned and Delay columns that MUST BE KEPT SAFE (strictly protected formula columns)
  PROTECTED_FORMULA_COLUMNS: ['J', 'L', 'O', 'Q', 'R', 'T', 'V', 'X', 'Z', 'AB'],

  // Backend write allowlist - strictly verified before any mutation
  WRITE_ALLOWLIST_COLUMNS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'M', 'N', 'P', 'S', 'U', 'W', 'Y', 'AA'],

  // Column D is Description / Firm Name
  FIRM_NAME_DESTINATION_COLUMN: 'D',

  // Default stage owners
  STAGE_OWNERS: {
    MANAGEMENT: 'EA',
    POSTING: 'Priyank',
    PAYMENT: 'Rahul',
    AUDIT: process.env.AUDITOR_NAME || 'Auditor',
    TALLY: 'Tally Accountant',
  },

  // Sync intervals
  POLL_INTERVAL_MS: 7000,
  POLL_JITTER_MS: 3000,
  RETRY_MAX: 3,

  // JWT Secret
  JWT_SECRET: process.env.JWT_SECRET || 'req-system-secret-key-prod-2026',
  JWT_EXPIRES_IN: '24h',
};

// Helper: Convert column letter to 0-based index
export function colToIdx(col) {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

// Helper: Convert 0-based index to column letter
export function idxToCol(idx) {
  let col = '';
  idx += 1;
  while (idx > 0) {
    let rem = (idx - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    idx = Math.floor((idx - 1) / 26);
  }
  return col;
}
