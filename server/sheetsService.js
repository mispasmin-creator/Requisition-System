import { CONFIG } from './config.js';
import { schemaValidator } from './schemaValidator.js';
import { google } from 'googleapis';

// Only fields that represent an actual user/business mutation participate in
// optimistic locking. Formula-owned Planned/Delay columns recalculate in the
// sheet and must refresh the UI without making an open form falsely stale.
const CONCURRENCY_FIELDS = [
  'timestamp',
  'requesterName',
  'firmName',
  'amount',
  'mode',
  'paymentLocation',
  'reason',
  'attachments',
  'actualApproval',
  'paidField',
  'approvedAmount',
  'actualPosting',
  'actualPayment',
  'paymentAttachment',
  'actualAudit',
];

/**
 * Format timestamp strictly as MM/DD/YYYY HH:MM:SS in Asia/Kolkata timezone
 * Matches native Google Sheets serial datetime parser for seamless formula math (no commas)
 */
export function formatGoogleSheetsTimestamp(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.TIMEZONE || 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const p = {};
  for (const part of formatter.formatToParts(date)) {
    p[part.type] = part.value;
  }

  // MM/DD/YYYY HH:MM:SS
  return `${p.month}/${p.day}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

export class SheetsService {
  constructor() {
    this.records = new Map(); // Keyed by RS-Indent No.
    this.reservedIds = new Set();
    this.masterDropdowns = {
      requesters: [],
      firmNames: [],
      paymentLocations: [],
      modes: [],
      lastFetched: null,
    };
    this.loginUsers = new Map();
    this.lastLoginUsersSync = null;
    this.versionCursor = 0;
    this.lastSyncTime = null;
    this.isSyncing = false;
    this.sseClients = new Set();
    this.idAllocationLock = false;
    this.pollingTimer = null;
    this.liveCredentialsAvailable = false;
    this.sheetsClient = null;
    this.syncStatus = {
      connected: false,
      mode: 'GVIZ_READ_ONLY',
      lastSuccess: null,
      error: null,
      recordCount: 0,
      activeSheetId: CONFIG.SPREADSHEET_ID,
    };

    this.initGoogleAuth();
  }

  initGoogleAuth() {
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        const auth = new google.auth.JWT(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          null,
          process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          ['https://www.googleapis.com/auth/spreadsheets']
        );
        this.sheetsClient = google.sheets({ version: 'v4', auth });
        this.liveCredentialsAvailable = true;
        this.syncStatus.mode = 'SERVICE_ACCOUNT_FULL_RW';
        console.log('[SheetsService] Google Service Account credentials loaded.');
      } else {
        this.syncStatus.mode = 'GVIZ_READ_PERSISTENCE';
        console.log('[SheetsService] Google Service Account credentials not provided. Using live gviz reader + synchronized backend store.');
      }
    } catch (err) {
      console.warn('[SheetsService] Auth initialization error:', err.message);
    }
  }

  startPolling() {
    this.sync();
    const interval = CONFIG.POLL_INTERVAL_MS + Math.floor(Math.random() * CONFIG.POLL_JITTER_MS);
    this.pollingTimer = setInterval(() => {
      this.sync();
    }, interval);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  addSseClient(clientRes) {
    this.sseClients.add(clientRes);
    // Send immediate initial sync state
    clientRes.write(`data: ${JSON.stringify({ type: 'INIT', version: this.versionCursor, lastSync: this.lastSyncTime })}\n\n`);
  }

  removeSseClient(clientRes) {
    this.sseClients.delete(clientRes);
  }

  broadcastDelta(delta) {
    this.versionCursor++;
    const payload = JSON.stringify({
      type: 'DELTA',
      version: this.versionCursor,
      timestamp: new Date().toISOString(),
      delta,
    });
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  /**
   * Fetch live data from Google Sheets gviz API
   */
  async fetchLiveSheet() {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.DATA_TAB)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Google Sheets read timed out after 15 seconds. Check sheet sharing or Service Account credentials.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch Google Sheet: HTTP ${res.status}`);
    }
    const text = await res.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonStr);
    return data.table;
  }

  /**
   * Fetch Master Tab dropdown values
   */
  async fetchMasterDropdowns() {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.MASTER_TAB)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let res;
      try {
        res = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) {
        console.warn(`[Master] Fetch returned HTTP ${res.status}`);
        return this.masterDropdowns;
      }
      const text = await res.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const data = JSON.parse(jsonStr);
      const rows = data.table.rows || [];

      // Row 0 is header in Master tab: ['Name Of The Requester', 'Firm Name', 'Payment Location', 'Mode']
      const requesters = new Set();
      const firmNames = new Set();
      const paymentLocations = new Set();
      const modes = new Set();

      // Read records from row 1 onward
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].c;
        if (row[0] && row[0].v) requesters.add(row[0].v.toString().trim());
        if (row[1] && row[1].v) firmNames.add(row[1].v.toString().trim());
        if (row[2] && row[2].v) paymentLocations.add(row[2].v.toString().trim());
        if (row[3] && row[3].v) modes.add(row[3].v.toString().trim());
      }

      this.masterDropdowns = {
        requesters: Array.from(requesters).filter(Boolean),
        firmNames: Array.from(firmNames).filter(Boolean),
        paymentLocations: Array.from(paymentLocations).filter(Boolean),
        modes: Array.from(modes).filter(Boolean),
        lastFetched: new Date().toISOString(),
      };
      return this.masterDropdowns;
    } catch (err) {
      console.warn('[SheetsService] Error fetching Master dropdowns:', err.message);
      return this.masterDropdowns;
    }
  }

  /**
   * Fetch all users from 'Login page' tab via Google Sheets gviz API
   */
  async fetchLoginUsers(force = false) {
    const lastSyncMs = typeof this.lastLoginUsersSync === 'number'
      ? this.lastLoginUsersSync
      : Date.parse(this.lastLoginUsersSync || '') || 0;
    if (!force && this.loginUsers.size > 0 && Date.now() - lastSyncMs < 60000) {
      return Array.from(this.loginUsers.values());
    }

    try {
      const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.LOGIN_TAB)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let res;
      try {
        res = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) {
        console.warn(`[Login page] Fetch returned HTTP ${res.status}`);
        return Array.from(this.loginUsers.values());
      }
      const text = await res.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const data = JSON.parse(jsonStr);
      const rows = data.table.rows || [];

      // If rows is empty or only headers, return current users
      if (rows.length <= 1) {
        return Array.from(this.loginUsers.values());
      }

      const usersMap = new Map();
      const parseVal = (cell) => (cell && cell.v !== undefined && cell.v !== null ? cell.v.toString().trim() : '');
      const parsePerm = (cell, defaultPerm = 'No') => {
        const val = parseVal(cell).toLowerCase();
        if (val === 'full' || val === 'yes' || val === 'yes (full)' || val === 'rw') return 'Full';
        if (val === 'view' || val === 'yes (view)' || val === 'ro') return 'View';
        if (val === 'no' || val === 'false') return 'No';
        return defaultPerm;
      };

      // Row 0 is header: ['Full Name', 'User', 'Role', 'Password', 'Status', 'Firm Access', 'Dashboard', 'Management Approval', 'Posting', 'Get Payment', 'Audit Payments', 'All Records', 'Administration']
      // Rows 1+ are user records
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].c;
        if (!row || !row[1] || !row[1].v) continue; // Must have username
        const username = parseVal(row[1]).toLowerCase();
        const role = parseVal(row[2]).toLowerCase() || 'requester';
        const isSuper =
          role === 'admin' ||
          role === 'super_admin' ||
          role === 'super admin' ||
          role === 'superadmin' ||
          username === 'admin';

        const userObj = {
          id: `sheet_${username}`,
          fullName: parseVal(row[0]) || username,
          username: username,
          role: isSuper ? 'admin' : role,
          isSuperAdmin: isSuper,
          password: parseVal(row[3]),
          status: parseVal(row[4]) || 'Active',
          firmAccess: isSuper ? 'ALL' : (parseVal(row[5]) || 'ALL'),
          permissions: isSuper
            ? {
              dashboard: 'Full',
              approval: 'Full',
              posting: 'Full',
              payment: 'Full',
              audit: 'Full',
              history: 'Full',
              admin: 'Full',
            }
            : {
              dashboard: parsePerm(row[6], 'Full'),
              approval: parsePerm(row[7], role === 'ea' ? 'Full' : 'No'),
              posting: parsePerm(row[8], role === 'posting' ? 'Full' : 'No'),
              payment: parsePerm(row[9], role === 'payment' ? 'Full' : 'No'),
              audit: parsePerm(row[10], role === 'auditor' ? 'Full' : 'No'),
              history: parsePerm(row[11], 'Full'),
              admin: parsePerm(row[12], 'No'),
            },
          sheetRowNumber: i + 1, // 1-indexed row in sheet
        };
        usersMap.set(username, userObj);
      }

      this.loginUsers = usersMap;
      this.lastLoginUsersSync = Date.now();
      return Array.from(this.loginUsers.values());
    } catch (err) {
      console.warn('[SheetsService] Error fetching Login page users:', err.message);
      return Array.from(this.loginUsers.values());
    }
  }

  /**
   * Save or update a user in 'Login page' tab
   */
  async saveUserToSheet(userData) {
    if (!userData.username) {
      throw new Error('Username is required.');
    }
    const cleanUsername = userData.username.trim().toLowerCase();

    // Ensure latest users
    await this.fetchLoginUsers();

    // Check if user already exists
    let targetRow = null;
    let totalRows = 1;

    for (const [uname, u] of this.loginUsers.entries()) {
      if (u.sheetRowNumber > totalRows) totalRows = u.sheetRowNumber;
      if (uname === cleanUsername) {
        targetRow = u.sheetRowNumber;
      }
    }

    if (!targetRow) {
      targetRow = totalRows + 1;
      if (targetRow < 2) targetRow = 2;
    }

    // Ensure header row 1 is written with full columns
    const headerCells = {
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
    };

    // Always ensure headers exist on row 1
    if (this.loginUsers.size === 0) {
      await this.writeToGoogleSheets({ tabName: CONFIG.LOGIN_TAB, row: 1, cells: headerCells });
    }

    const perms = userData.permissions || {};
    const role = (userData.role || 'requester').toLowerCase();
    const isSuper =
      role === 'admin' ||
      role === 'super_admin' ||
      role === 'super admin' ||
      role === 'superadmin' ||
      cleanUsername === 'admin';

    const userCells = {
      A: userData.fullName || cleanUsername,
      B: cleanUsername,
      C: isSuper ? 'admin' : userData.role || 'requester',
      D: userData.password || '',
      E: userData.status || 'Active',
      F: isSuper ? 'ALL' : (userData.firmAccess || 'ALL'),
      G: isSuper ? 'Full' : (perms.dashboard || 'Full'),
      H: isSuper ? 'Full' : (perms.approval || (role === 'ea' ? 'Full' : 'No')),
      I: isSuper ? 'Full' : (perms.posting || (role === 'posting' ? 'Full' : 'No')),
      J: isSuper ? 'Full' : (perms.payment || (role === 'payment' ? 'Full' : 'No')),
      K: isSuper ? 'Full' : (perms.audit || (role === 'auditor' ? 'Full' : 'No')),
      L: isSuper ? 'Full' : (perms.history || 'Full'),
      M: isSuper ? 'Full' : (perms.admin || 'No'),
    };

    await this.writeToGoogleSheets({
      tabName: CONFIG.LOGIN_TAB,
      row: targetRow,
      cells: userCells,
    });

    const updatedUser = {
      id: `sheet_${cleanUsername}`,
      fullName: userCells.A,
      username: cleanUsername,
      role: userCells.C,
      password: userCells.D,
      status: userCells.E,
      firmAccess: userCells.F,
      permissions: {
        dashboard: userCells.G,
        approval: userCells.H,
        posting: userCells.I,
        payment: userCells.J,
        audit: userCells.K,
        history: userCells.L,
        admin: userCells.M,
      },
      sheetRowNumber: targetRow,
    };
    this.loginUsers.set(cleanUsername, updatedUser);

    return updatedUser;
  }

  /**
   * Main sync method
   */
  async sync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      // 1. Fetch Master Dropdowns & Login Users if not cached
      if (!this.masterDropdowns.lastFetched) {
        await this.fetchMasterDropdowns();
      }
      if (!this.lastLoginUsersSync) {
        await this.fetchLoginUsers();
      }

      // 2. Fetch Sheet1 data
      const table = await this.fetchLiveSheet();
      const rows = table.rows || [];

      // Dynamic header row detection (finds row with 'Timestamp' or 'RS-Indent No.')
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const col0 = rows[i]?.c?.[0]?.v?.toString().toLowerCase() || '';
        const col1 = rows[i]?.c?.[1]?.v?.toString().toLowerCase() || '';
        if (col0.includes('timestamp') || col1.includes('rs-indent') || col1.includes('indent')) {
          headerRowIndex = i;
          break;
        }
      }

      // Validate schema if header found
      if (headerRowIndex !== -1 && rows[headerRowIndex]) {
        const headerValues = rows[headerRowIndex].c.map((cell) => (cell ? cell.v : ''));
        schemaValidator.validateRow6(headerValues);
      } else if (rows.length >= 6) {
        const row6Values = rows[5].c.map((cell) => (cell ? cell.v : ''));
        schemaValidator.validateRow6(row6Values);
      }

      const changedRecords = [];
      const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : Math.min(CONFIG.DATA_START_ROW - 1, rows.length);

      // Read business data from row after header
      for (let r = startIndex; r < rows.length; r++) {
        const row = rows[r]?.c || [];
        // Column B (index 1) is RS-Indent No.
        const rsIndentNo = row[1]?.v ? row[1].v.toString().trim() : null;
        if (!rsIndentNo) continue; // Skip empty row where formula might exist without business record
        // Skip header repetitions if any
        if (rsIndentNo.toLowerCase().includes('indent') || rsIndentNo.toLowerCase() === 'need') continue;

        // GViz omits blank leading rows, so its array index is not the real
        // spreadsheet row number. Anchor records to the configured header row
        // once the header has been detected (header row 6 -> first data row 7).
        const sheetRowNumber = headerRowIndex !== -1
          ? CONFIG.HEADER_ROW + (r - headerRowIndex)
          : r + 1;
        const currentRecord = this.records.get(rsIndentNo);

        // Helper to format date strings and clean Date() expressions
        const fmtVal = (cell) => {
          if (!cell || cell.v === null || cell.v === undefined) return '';
          if (cell.f) {
            // cell has formatted string in gviz
            return cell.f;
          }
          const str = cell.v.toString();
          if (str.startsWith('Date(')) {
            try {
              const parts = str.slice(5, -1).split(',').map(Number);
              const d = new Date(parts[0], parts[1], parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);
              return d.toLocaleString('en-IN');
            } catch {
              return str;
            }
          }
          return str;
        };

        const record = {
          rsIndentNo,
          sheetRowNumber,
          timestamp: fmtVal(row[0]),       // Col A: Timestamp
          requesterName: fmtVal(row[2]),   // Col C: Name Of The Requester
          firmName: fmtVal(row[3]) || currentRecord?.firmName || '', // Col D: Description / Firm Name
          amount: parseFloat(row[4]?.v || 0) || 0, // Col E: Amount
          mode: fmtVal(row[5]),            // Col F: Mode
          paymentLocation: fmtVal(row[6]), // Col G: Payment Location
          reason: fmtVal(row[7]),          // Col H: Reason
          attachments: fmtVal(row[8]),     // Col I: Any Attachments

          // Stage 1: Management Approval
          plannedApproval: fmtVal(row[9]) || '—',   // Col J: Planned (Protected Formula)
          actualApproval: fmtVal(row[10]),         // Col K: Actual (Timestamp)
          delayApproval: fmtVal(row[11]) || '—',    // Col L: Delay (Protected Formula)
          paidField: fmtVal(row[12]),              // Col M: Paid
          approvedAmount: parseFloat(row[13]?.v || 0) || 0, // Col N: Approved Amount

          // Stage 2: Posting
          plannedPosting: fmtVal(row[14]) || '—',  // Col O: Planned 2 (Protected Formula)
          actualPosting: fmtVal(row[15]),          // Col P: Actual 2 (Timestamp)
          delayPosting: fmtVal(row[16]) || '—',    // Col Q: Delay 2 (Protected Formula)

          // Stage 3: Get Payment
          plannedPayment: fmtVal(row[17]) || '—',  // Col R: Planned 3 (Protected Formula)
          actualPayment: fmtVal(row[18]),          // Col S: Actual 3 (Timestamp)
          delayPayment: fmtVal(row[19]) || '—',    // Col T: Delay 3 (Protected Formula)

          // Stage 4: Audit Payments
          paymentAttachment: fmtVal(row[20]),       // Col U: Payment attachment
          paymentProof: fmtVal(row[20]) || currentRecord?.paymentProof || '',
          // Audit columns follow the payment attachment column: V/W/X.
          plannedAudit: fmtVal(row[21]) || '—',
          actualAudit: fmtVal(row[22]),
          delayAudit: fmtVal(row[23]) || '—',
          remarks: currentRecord?.remarks || '',
          // A background sync must not look like a user mutation. Keep the
          // optimistic-lock version stable until actual sheet data changes.
          version: currentRecord?.version || 0,
          lastUpdated: currentRecord?.lastUpdated || null,
        };

        // Refresh all changed sheet values, but only increment the optimistic
        // lock for user-editable business fields. Formula recalculation in
        // Planned/Delay columns is not a concurrent user edit.
        const sheetDataChanged = !currentRecord || Object.keys(record).some((key) => {
          if (key === 'version' || key === 'lastUpdated') return false;
          return currentRecord[key] !== record[key];
        });
        const conflictRelevantChange =
          !currentRecord || CONCURRENCY_FIELDS.some((key) => currentRecord[key] !== record[key]);

        if (sheetDataChanged) {
          record.version = conflictRelevantChange
            ? (currentRecord?.version || 0) + 1
            : currentRecord.version;
          record.lastUpdated = conflictRelevantChange
            ? new Date().toISOString()
            : currentRecord.lastUpdated;
          this.records.set(rsIndentNo, record);
          changedRecords.push(record);
        }
      }

      this.lastSyncTime = new Date().toISOString();
      this.syncStatus.connected = true;
      this.syncStatus.lastSuccess = this.lastSyncTime;
      this.syncStatus.recordCount = this.records.size;
      this.syncStatus.error = null;

      if (changedRecords.length > 0) {
        this.broadcastDelta(changedRecords);
      }
    } catch (err) {
      console.warn('[SheetsService] Sync error:', err.message);
      this.syncStatus.error = err.message;
      this.syncStatus.connected = false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Concurrency-safe RS-Indent No. generator starting from RS - 0001
   */
  async generateNextIndentNo() {
    while (this.idAllocationLock) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.idAllocationLock = true;
    try {
      let maxSeq = 0;
      // Match patterns like "RS - 0001", "RS - 1", "RS-0001"
      const seqRegex = /^RS\s*-\s*(\d+)$/i;

      for (const id of this.records.keys()) {
        if (!id) continue;
        const match = id.trim().match(seqRegex);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
      for (const id of this.reservedIds) {
        if (!id) continue;
        const match = id.trim().match(seqRegex);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }

      const nextSeq = String(maxSeq + 1).padStart(4, '0');
      const allocatedId = `RS - ${nextSeq}`;
      this.reservedIds.add(allocatedId);
      return allocatedId;
    } finally {
      this.idAllocationLock = false;
    }
  }

  /**
   * Find next empty business row by checking Column B from row 7 downwards
   */
  findNextEmptyRow() {
    let highestRow = CONFIG.DATA_START_ROW - 1; // Row 6
    for (const record of this.records.values()) {
      if (record.sheetRowNumber && record.sheetRowNumber > highestRow) {
        highestRow = record.sheetRowNumber;
      }
    }
    if (this.reservedRows) {
      for (const r of this.reservedRows) {
        if (r > highestRow) highestRow = r;
      }
    }
    return highestRow + 1;
  }

  /**
   * Resolve live row number by stable RS-Indent No.
   */
  resolveRowByIndentNo(indentNo) {
    const record = this.records.get(indentNo);
    return record?.sheetRowNumber || null;
  }

  /**
   * Submit new requisition
   * Strictly adheres to FORMULA PRESERVATION RULE:
   * Only approved non-formula columns A, B, C, D, E, F, G, H (and Firm Name) are written.
   * Formula columns I, K, N, P, Q, S, T, V are strictly omitted!
   */
  async submitNewRequisition(formData, user) {
    const indentNo = await this.generateNextIndentNo();
    const allocatedRow = this.findNextEmptyRow();
    if (!this.reservedRows) this.reservedRows = new Set();
    this.reservedRows.add(allocatedRow);

    // Google Sheets friendly timestamp: MM/DD/YYYY HH:MM:SS (strictly no comma)
    const timestampStr = formatGoogleSheetsTimestamp(new Date());

    // Explicit non-formula write payload (Cols A-I)
    const writePayload = {
      row: allocatedRow,
      cells: {
        A: timestampStr,
        B: indentNo,
        C: formData.requesterName || user.requesterName || user.displayName,
        D: formData.firmName || '', // Column D: Description / Firm Name
        E: parseFloat(formData.amount) || 0, // Column E: Amount
        F: formData.mode || '', // Column F: Mode
        G: formData.paymentLocation || '', // Column G: Payment Location
        H: formData.reason || '', // Column H: Reason
        I: formData.attachments || '', // Column I: Any Attachments
      },
    };

    // Verify formula safety: Assert NO protected formula column is in writePayload
    for (const protCol of CONFIG.PROTECTED_FORMULA_COLUMNS) {
      if (writePayload.cells[protCol] !== undefined) {
        throw new Error(`CRITICAL SECURITY FAULT: Mutation targets protected formula column ${protCol}. Operation aborted.`);
      }
    }

    const newRecord = {
      rsIndentNo: indentNo,
      sheetRowNumber: allocatedRow,
      timestamp: timestampStr,
      requesterName: formData.requesterName || user.requesterName || user.displayName,
      firmName: formData.firmName || '',
      amount: parseFloat(formData.amount) || 0,
      mode: formData.mode || '',
      paymentLocation: formData.paymentLocation || '',
      reason: formData.reason || '',
      attachments: formData.attachments || '',
      plannedApproval: '—',
      actualApproval: '',
      delayApproval: '—',
      paidField: '',
      approvedAmount: 0,
      plannedPosting: '—',
      actualPosting: '',
      delayPosting: '—',
      plannedPayment: '—',
      actualPayment: '',
      delayPayment: '—',
      plannedAudit: '—',
      actualAudit: '',
      delayAudit: '—',
      version: 1,
      lastUpdated: new Date().toISOString(),
    };

    // Save to memory store
    this.records.set(indentNo, newRecord);
    this.reservedIds.delete(indentNo);
    if (this.reservedRows) this.reservedRows.delete(allocatedRow);

    // Perform live Google Sheets write if service account is configured
    await this.writeToGoogleSheets(writePayload);

    this.broadcastDelta([newRecord]);
    return newRecord;
  }

  /**
   * Update Stage Action
   * Enforces stage transition validation and formula safety
   */
  async updateStageAction(indentNo, stageName, stageData, user, expectedVersion) {
    const currentRecord = this.records.get(indentNo);
    if (!currentRecord) {
      throw new Error(`Record ${indentNo} not found.`);
    }
    // Work on a copy so a failed Google Sheets write cannot leave the
    // in-memory API state ahead of the actual spreadsheet.
    const record = { ...currentRecord };

    const isSuper =
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.role === 'super admin' ||
      user.role === 'superadmin' ||
      (user.username && user.username.toLowerCase() === 'admin');

    // Super Admin is the final authority and may intentionally act on the
    // latest server copy even when a background sync refreshed the version.
    // Other users retain strict optimistic locking to prevent lost updates.
    if (!isSuper && expectedVersion !== undefined && currentRecord.version !== expectedVersion) {
      throw new Error(`Concurrency Conflict: Record was modified by another user. Please refresh and review.`);
    }

    const resolvedRow = this.resolveRowByIndentNo(indentNo);
    if (!resolvedRow) {
      throw new Error(`Unable to resolve row number for record ${indentNo}.`);
    }

    // Google Sheets friendly timestamp: MM/DD/YYYY HH:MM:SS (strictly no comma)
    const timestampStr = formatGoogleSheetsTimestamp(new Date());

    const writePayload = {
      row: resolvedRow,
      cells: {},
    };

    if (stageName === 'APPROVAL') {
      // Management Approval: writes K (Actual), M (Paid), N (Approved Amount)
      // Planned (J) and Delay (L) are protected formulas
      if (user.role !== 'ea' && !isSuper) {
        throw new Error('Unauthorized: Only EA or Super Admin can approve requisitions.');
      }
      const approvedAmt = parseFloat(stageData.approvedAmount ?? record.amount);
      if (approvedAmt > record.amount && !stageData.exceedReason) {
        throw new Error('Approved amount exceeds requested amount. Reason is required.');
      }
      if (['Hold', 'Rejected'].includes(stageData.paidField) && !stageData.remarks?.trim()) {
        throw new Error(`A remark is required when the approval decision is ${stageData.paidField}.`);
      }

      const approvalDecision = stageData.paidField || 'Yes';
      const completesApproval = approvalDecision !== 'Hold';

      // Hold deliberately keeps Management Approval pending. Rejected closes
      // Management Approval but must never unlock downstream workflow stages.
      writePayload.cells['K'] = completesApproval ? timestampStr : '';
      writePayload.cells['M'] = approvalDecision; // Column M: Paid
      writePayload.cells['N'] = approvedAmt; // Column N: Approved Amount

      record.actualApproval = completesApproval ? timestampStr : '';
      record.paidField = approvalDecision;
      record.approvedAmount = approvedAmt;
      if (stageData.remarks?.trim()) {
        record.remarks = stageData.remarks.trim();
      }

      if (approvalDecision === 'Hold' || approvalDecision === 'Rejected') {
        // A held/rejected requisition cannot retain or enter downstream stages.
        Object.assign(writePayload.cells, { P: '', S: '', U: '', W: '' });
        record.actualPosting = '';
        record.actualPayment = '';
        record.paymentAttachment = '';
        record.paymentProof = '';
        record.actualAudit = '';
      }
    } else if (stageName === 'POSTING') {
      // Posting: requires approval actual first. Writes P (Actual 2)
      // Planned 2 (O) and Delay 2 (Q) are protected formulas
      if (user.role !== 'posting' && !isSuper) {
        throw new Error('Unauthorized: Only Posting In-Charge or Super Admin can confirm posting.');
      }
      if (!record.actualApproval || record.paidField !== 'Yes') {
        throw new Error('Invalid stage transition: Management approval must be accepted before posting.');
      }

      writePayload.cells['P'] = timestampStr; // Column P: Actual 2
      record.actualPosting = timestampStr;
    } else if (stageName === 'PAYMENT') {
      // Payment: requires posting actual first. Writes S (Actual 3)
      // Planned 3 (R) and Delay 3 (T) are protected formulas
      if (user.role !== 'payment' && !isSuper) {
        throw new Error('Unauthorized: Only Payment In-Charge or Super Admin can confirm payment.');
      }
      if (!record.actualPosting) {
        throw new Error('Invalid stage transition: Posting must be completed before recording payment.');
      }
      if (!stageData.remarks?.trim()) {
        throw new Error('Payment remark is required.');
      }

      writePayload.cells['S'] = timestampStr; // Column S: Actual 3
      record.actualPayment = timestampStr;
      record.paymentDecision = stageData.paymentDecision || 'Yes';
      record.remarks = stageData.remarks.trim();
      if (stageData.paymentProof) {
        record.paymentProof = stageData.paymentProof;
        writePayload.cells['U'] = stageData.paymentProof;
      }
    } else if (stageName === 'AUDIT') {
      // Audit: requires payment actual first. Writes V (Actual 4)
      // Planned 4 (U) and Delay 4 (W) are protected formulas
      if (user.role !== 'auditor' && !isSuper) {
        throw new Error('Unauthorized: Only configured Auditor or Super Admin can audit payments.');
      }
      if (!record.actualPayment) {
        throw new Error('Invalid stage transition: Payment must be completed before auditing.');
      }

      writePayload.cells['W'] = timestampStr; // Column W: Actual 4
      record.actualAudit = timestampStr;
      if (stageData.remarks) {
        record.remarks = stageData.remarks;
      }
    } else {
      throw new Error(`Unknown stage action: ${stageName}`);
    }

    // Strict Formula Protection Check
    for (const protCol of CONFIG.PROTECTED_FORMULA_COLUMNS) {
      if (writePayload.cells[protCol] !== undefined) {
        throw new Error(`CRITICAL SECURITY FAULT: Attempted write to protected formula column ${protCol}.`);
      }
    }

    record.version = (record.version || 0) + 1;
    record.lastUpdated = new Date().toISOString();

    // Persist to Google Sheets if credentials present
    await this.writeToGoogleSheets(writePayload);

    this.records.set(indentNo, record);
    this.broadcastDelta([record]);
    return record;
  }

  /**
   * Targeted cell write to Google Sheets via Google Sheets API (or Apps Script)
   */
  async writeToGoogleSheets(writePayload) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    const targetTab = writePayload.tabName || CONFIG.DATA_TAB;

    if (appsScriptUrl && appsScriptUrl.trim()) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        let res;
        try {
          res = await fetch(appsScriptUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret: 'req-system-secret-key-prod-2026',
              tabName: targetTab,
              row: writePayload.row,
              cells: writePayload.cells,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        const responseText = await res.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(`Apps Script returned an invalid non-JSON response (HTTP ${res.status}).`);
        }
        if (!res.ok) {
          throw new Error(`Apps Script returned HTTP ${res.status}.`);
        }
        if (result.error) {
          console.error(`[AppsScript Live Write Error] Tab ${targetTab} Row ${writePayload.row}:`, result.error);
          throw new Error(`Google Sheets Webhook error: ${result.error}`);
        }
        if (result.success !== true) {
          throw new Error('Apps Script did not confirm that the sheet write succeeded.');
        }
        console.log(`[AppsScript Live Write Succeeded] Tab ${targetTab} Row ${writePayload.row}:`, result);
        return result;
      } catch (err) {
        console.error('[AppsScript Write Error]:', err.message);
        throw err;
      }
    }

    if (!this.liveCredentialsAvailable || !this.sheetsClient) {
      console.log(`[GoogleSheets Write Simulated] Tab ${targetTab} Row ${writePayload.row}:`, writePayload.cells);
      return;
    }

    try {
      // Batch update only permitted non-formula cells
      const data = [];
      for (const [col, value] of Object.entries(writePayload.cells)) {
        data.push({
          range: `${targetTab}!${col}${writePayload.row}`,
          values: [[value]],
        });
      }

      await this.sheetsClient.spreadsheets.values.batchUpdate({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data,
        },
      });
      console.log(`[GoogleSheets Write Succeeded] Row ${writePayload.row} updated.`);
    } catch (err) {
      console.error('[GoogleSheets Write Error]:', err.message);
      throw new Error(`Google Sheets Write Failed: ${err.message}`);
    }
  }

  /**
   * Upload image or PDF directly to designated Google Drive folder via Google Apps Script Web App
   */
  async uploadToGoogleDrive({ fileName, fileData, mimeType, folderId }) {
    const targetFolderId = folderId || CONFIG.DRIVE_FOLDER_ID || '1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR';
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;

    // Clean base64 if it has data URL prefix like "data:image/png;base64,"
    let cleanBase64 = fileData;
    if (cleanBase64 && cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,')[1];
    }

    if (appsScriptUrl && appsScriptUrl.trim() && process.env.NODE_ENV !== 'test') {
      try {
        console.log(`[DriveUpload] Uploading "${fileName}" (${mimeType || 'unknown'}) to Drive Folder: ${targetFolderId}`);
        const res = await fetch(appsScriptUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPLOAD_FILE',
            secret: 'req-system-secret-key-prod-2026',
            folderId: targetFolderId,
            fileName: fileName || 'Attachment',
            fileData: cleanBase64,
            mimeType: mimeType || 'application/octet-stream',
          }),
        });

        const result = await res.json();
        if (result.error) {
          console.error('[DriveUpload Apps Script Error]:', result.error);
          if (result.error.includes('Missing row') || result.error.includes('cells')) {
            throw new Error('Google Apps Script me v2.2 Drive Upload code deploy karein: Admin panel se "Apps Script Code" copy karke Google Sheet me Deploy karein.');
          }
          throw new Error(`Google Drive Upload Error: ${result.error}`);
        }

        console.log(`[DriveUpload Succeeded] File ID: ${result.fileId} | Link: ${result.fileUrl}`);
        return {
          success: true,
          fileId: result.fileId,
          fileName: result.fileName || fileName,
          fileUrl: result.fileUrl,
          folderId: targetFolderId,
        };
      } catch (err) {
        console.error('[DriveUpload Error]:', err.message);
        throw err;
      }
    }

    // Fallback for tests or local mock
    const mockId = `mock_drive_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockUrl = `https://drive.google.com/file/d/${mockId}/view?usp=drivesdk`;
    console.log(`[DriveUpload Mock] File "${fileName}" simulated at: ${mockUrl}`);
    return {
      success: true,
      fileId: mockId,
      fileName: fileName || 'Attachment.pdf',
      fileUrl: mockUrl,
      folderId: targetFolderId,
      mock: true,
    };
  }

  getRecordsList() {
    return Array.from(this.records.values());
  }

  getRecord(indentNo) {
    return this.records.get(indentNo);
  }
}

export const sheetsService = new SheetsService();
