import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';
import { authenticate, authMiddleware, filterRequisitionsForUser, getAllUsers, isSuperAdmin } from './auth.js';
import { sheetsService } from './sheetsService.js';
import { schemaValidator } from './schemaValidator.js';

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/sync/events') {
      console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const result = await authenticate(username, password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    res.json(result);
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/auth/demo-users', (req, res) => {
  res.json({ users: getAllUsers() });
});

// ==========================================
// MASTER DROPDOWNS
// ==========================================

app.get('/api/master', authMiddleware, async (req, res) => {
  const dropdowns = await sheetsService.fetchMasterDropdowns();
  res.json(dropdowns);
});

// ==========================================
// REQUISITION CRUD & WORKFLOW
// ==========================================

/**
 * Helper to compute stage status for a record
 */
function computeRecordStatus(record) {
  const now = new Date();

  const isOverdue = (plannedStr, actualStr) => {
    if (!plannedStr || plannedStr === '—' || actualStr) return false;
    const plannedDate = new Date(plannedStr);
    return !isNaN(plannedDate.getTime()) && plannedDate < now;
  };

  // Stage 1: Approval
  let approvalStatus = 'PENDING';
  if (record.paidField === 'Rejected') approvalStatus = 'REJECTED';
  else if (record.paidField === 'Hold') approvalStatus = 'HOLD';
  else if (record.actualApproval) approvalStatus = 'COMPLETED';
  else if (isOverdue(record.plannedApproval, record.actualApproval)) approvalStatus = 'OVERDUE';

  // Stage 2: Posting
  let postingStatus = 'NOT_STARTED';
  if (!record.actualApproval || record.paidField !== 'Yes') postingStatus = 'NOT_STARTED';
  else if (record.actualPosting) postingStatus = 'COMPLETED';
  else if (isOverdue(record.plannedPosting, record.actualPosting)) postingStatus = 'OVERDUE';
  else postingStatus = 'PENDING';

  // Stage 3: Get Payment
  let paymentStatus = 'NOT_STARTED';
  if (!record.actualPosting) paymentStatus = 'NOT_STARTED';
  else if (record.actualPayment) paymentStatus = 'COMPLETED';
  else if (isOverdue(record.plannedPayment, record.actualPayment)) paymentStatus = 'OVERDUE';
  else paymentStatus = 'PENDING';

  // Stage 4: Audit
  let auditStatus = 'NOT_STARTED';
  if (!record.actualPayment) auditStatus = 'NOT_STARTED';
  else if (record.actualAudit) auditStatus = 'COMPLETED';
  else if (isOverdue(record.plannedAudit, record.actualAudit)) auditStatus = 'OVERDUE';
  else auditStatus = 'PENDING';

  // Stage 5: Tally Entry
  let tallyStatus = 'NOT_STARTED';
  if (!record.actualAudit) tallyStatus = 'NOT_STARTED';
  else if (record.actualTally) tallyStatus = 'COMPLETED';
  else if (isOverdue(record.plannedTally, record.actualTally)) tallyStatus = 'OVERDUE';
  else tallyStatus = 'PENDING';

  // Overall workflow state
  let overall = 'IN_PROGRESS';
  if (record.paidField === 'Rejected') overall = 'REJECTED';
  else if (record.paidField === 'Hold') overall = 'HOLD';
  else if (record.actualTally) overall = 'COMPLETED';
  else if (approvalStatus === 'OVERDUE' || postingStatus === 'OVERDUE' || paymentStatus === 'OVERDUE' || auditStatus === 'OVERDUE' || tallyStatus === 'OVERDUE') {
    overall = 'OVERDUE';
  }

  return {
    approvalStatus,
    postingStatus,
    paymentStatus,
    auditStatus,
    tallyStatus,
    overall,
  };
}

/**
 * GET /api/requisitions
 * Server-side authorized query, filtering, pagination, and unified stage counters
 */
app.get('/api/requisitions', authMiddleware, async (req, res) => {
  // If in-memory store has not yet completed initial sync, trigger sync immediately
  if (!sheetsService.hasInitialSync) {
    try {
      await sheetsService.sync();
    } catch (err) {
      console.warn('[API] Immediate sync warning:', err.message);
    }
  }

  const allRecords = sheetsService.getRecordsList();
  // Filter by user role authorization
  const authorized = filterRequisitionsForUser(allRecords, req.user);

  // Compute unified stage counters across all authorized records
  const counters = {
    total: authorized.length,
    approval: { pending: 0, completed: 0, overdue: 0 },
    posting: { pending: 0, completed: 0, overdue: 0, notStarted: 0 },
    payment: { pending: 0, completed: 0, overdue: 0, notStarted: 0 },
    audit: { pending: 0, completed: 0, overdue: 0, notStarted: 0 },
    tally: { pending: 0, completed: 0, overdue: 0, notStarted: 0 },
  };

  const recordsWithStatus = authorized.map((rec) => {
    const statuses = computeRecordStatus(rec);
    // Update counters
    if (statuses.approvalStatus === 'PENDING' || statuses.approvalStatus === 'HOLD') counters.approval.pending++;
    else if (statuses.approvalStatus === 'COMPLETED' || statuses.approvalStatus === 'REJECTED') counters.approval.completed++;
    else if (statuses.approvalStatus === 'OVERDUE') counters.approval.overdue++;

    if (statuses.postingStatus === 'PENDING') counters.posting.pending++;
    else if (statuses.postingStatus === 'COMPLETED') counters.posting.completed++;
    else if (statuses.postingStatus === 'OVERDUE') counters.posting.overdue++;
    else counters.posting.notStarted++;

    if (statuses.paymentStatus === 'PENDING') counters.payment.pending++;
    else if (statuses.paymentStatus === 'COMPLETED') counters.payment.completed++;
    else if (statuses.paymentStatus === 'OVERDUE') counters.payment.overdue++;
    else counters.payment.notStarted++;

    if (statuses.auditStatus === 'PENDING') counters.audit.pending++;
    else if (statuses.auditStatus === 'COMPLETED') counters.audit.completed++;
    else if (statuses.auditStatus === 'OVERDUE') counters.audit.overdue++;
    else counters.audit.notStarted++;

    if (statuses.tallyStatus === 'PENDING') counters.tally.pending++;
    else if (statuses.tallyStatus === 'COMPLETED') counters.tally.completed++;
    else if (statuses.tallyStatus === 'OVERDUE') counters.tally.overdue++;
    else counters.tally.notStarted++;

    return { ...rec, ...statuses };
  });

  // Query filters
  let filtered = recordsWithStatus;
  const { stage, status, search, mode, firm, page = 1, limit = 1000 } = req.query;

  if (stage && status) {
    const stageKey = `${stage.toLowerCase()}Status`;
    const requestedStatus = status.toUpperCase();
    filtered = filtered.filter((r) => {
      if (stage.toLowerCase() === 'approval' && requestedStatus === 'PENDING') {
        return r[stageKey] === 'PENDING' || r[stageKey] === 'HOLD';
      }
      if (stage.toLowerCase() === 'approval' && requestedStatus === 'COMPLETED') {
        return r[stageKey] === 'COMPLETED' || r[stageKey] === 'REJECTED';
      }
      return r[stageKey] === requestedStatus;
    });
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.rsIndentNo && r.rsIndentNo.toLowerCase().includes(q)) ||
        (r.requesterName && r.requesterName.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)) ||
        (r.firmName && r.firmName.toLowerCase().includes(q))
    );
  }

  if (mode) {
    filtered = filtered.filter((r) => r.mode === mode);
  }

  if (firm) {
    filtered = filtered.filter((r) => r.firmName === firm);
  }

  // Sort descending by row or timestamp
  filtered.sort((a, b) => (b.sheetRowNumber || 0) - (a.sheetRowNumber || 0));

  // Pagination
  const pageNum = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const startIndex = (pageNum - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  res.json({
    data: paginated,
    pagination: {
      page: pageNum,
      limit: pageSize,
      totalRecords: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize),
    },
    counters,
  });
});

app.get('/api/requisitions/:id', authMiddleware, (req, res) => {
  const record = sheetsService.getRecord(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Requisition not found.' });
  }
  const statuses = computeRecordStatus(record);
  res.json({ ...record, ...statuses });
});

// Idempotent submission store
const submissionIdempotencyCache = new Map();

app.post('/api/requisitions', authMiddleware, async (req, res) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey && submissionIdempotencyCache.has(idempotencyKey)) {
      return res.json(submissionIdempotencyCache.get(idempotencyKey));
    }

    const { requesterName, firmName, amount, mode, paymentLocation, reason, attachments } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount greater than 0 is required.' });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required.' });
    }
    if (!requesterName || !requesterName.trim()) {
      return res.status(400).json({ error: 'Requester name must be selected.' });
    }

    // Every account selects the requester explicitly from the Master dropdown.
    const finalRequesterName = requesterName.trim();

    const newRecord = await sheetsService.submitNewRequisition(
      {
        requesterName: finalRequesterName,
        firmName,
        amount: parseFloat(amount),
        mode,
        paymentLocation,
        reason,
        attachments,
      },
      req.user
    );

    const statuses = computeRecordStatus(newRecord);
    const responsePayload = { ...newRecord, ...statuses };

    if (idempotencyKey) {
      submissionIdempotencyCache.set(idempotencyKey, responsePayload);
    }

    res.status(201).json(responsePayload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/requisitions/:id/stage', authMiddleware, async (req, res) => {
  try {
    const { stageName, stageData, expectedVersion } = req.body;
    if (!stageName) {
      return res.status(400).json({ error: 'stageName is required.' });
    }

    const updated = await sheetsService.updateStageAction(
      req.params.id,
      stageName.toUpperCase(),
      stageData || {},
      req.user,
      expectedVersion
    );

    const statuses = computeRecordStatus(updated);
    res.json({ ...updated, ...statuses });
  } catch (err) {
    if (err.message.includes('Concurrency Conflict')) {
      return res.status(409).json({ error: err.message });
    }
    if (err.message.includes('Unauthorized') || err.message.includes('Invalid stage transition')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CONFIGURATION & DIAGNOSTICS
// ==========================================

app.get('/api/config', authMiddleware, (req, res) => {
  res.json({
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    dataTab: CONFIG.DATA_TAB,
    masterTab: CONFIG.MASTER_TAB,
    headerRow: CONFIG.HEADER_ROW,
    dataStartRow: CONFIG.DATA_START_ROW,
    protectedFormulaColumns: CONFIG.PROTECTED_FORMULA_COLUMNS,
    writeAllowlistColumns: CONFIG.WRITE_ALLOWLIST_COLUMNS,
    schemaReport: schemaValidator.getReport(),
    syncStatus: sheetsService.syncStatus,
    stageOwners: CONFIG.STAGE_OWNERS,
    appsScriptUrl: CONFIG.APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL || '',
    driveFolderId: CONFIG.DRIVE_FOLDER_ID,
    driveFolderUrl: CONFIG.DRIVE_FOLDER_URL,
  });
});

app.post('/api/config', authMiddleware, (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Only Super Admin can modify system configuration.' });
  }

  const { firmNameColumn, stageOwners } = req.body;
  if (firmNameColumn) {
    schemaValidator.setFirmNameColumn(firmNameColumn);
  }
  if (stageOwners) {
    Object.assign(CONFIG.STAGE_OWNERS, stageOwners);
  }

  res.json({
    success: true,
    message: 'Configuration updated successfully.',
    schemaReport: schemaValidator.getReport(),
    stageOwners: CONFIG.STAGE_OWNERS,
  });
});

// ==========================================
// FILE UPLOAD (GOOGLE DRIVE SYNC)
// ==========================================

app.post('/api/upload', authMiddleware, async (req, res) => {
  const { fileName, fileData, mimeType, folderId } = req.body;

  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'fileName and fileData (base64) are required.' });
  }

  // Validate allowed extensions and mimeTypes (images and PDF)
  const isImage = (mimeType && mimeType.startsWith('image/')) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
  const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(fileName);

  if (!isImage && !isPdf) {
    return res.status(400).json({
      error: 'Unsupported file type. Only images (PNG, JPG, WEBP) and PDF files are allowed.',
    });
  }

  try {
    const uploadResult = await sheetsService.uploadToGoogleDrive({
      fileName,
      fileData,
      mimeType: mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),
      folderId,
    });

    res.json(uploadResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// USER ADMINISTRATION (LOGIN PAGE SHEET)
// ==========================================

app.get('/api/admin/users', authMiddleware, async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Only Super Admin can view and manage user administration.' });
  }

  try {
    const sheetUsers = await sheetsService.fetchLoginUsers();
    const dropdowns = await sheetsService.fetchMasterDropdowns();

    res.json({
      users: sheetUsers,
      firmNames: dropdowns.firmNames || [],
      syncStatus: sheetsService.syncStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', authMiddleware, async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Only Super Admin can create or update users.' });
  }

  const { username, fullName } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required.' });
  }
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Full Name is required.' });
  }

  try {
    const savedUser = await sheetsService.saveUserToSheet(req.body);
    res.json({
      success: true,
      message: `User ${savedUser.username} saved and synchronized to Login page sheet successfully.`,
      user: savedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/apps-script-code', authMiddleware, (req, res) => {
  try {
    let code = '';
    const possiblePaths = [
      path.resolve(process.cwd(), 'server/appsScriptCode.js'),
      path.resolve('server/appsScriptCode.js'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        code = fs.readFileSync(p, 'utf8');
        break;
      }
    }
    res.json({
      success: true,
      appsScriptUrl: CONFIG.APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL || '',
      code: code,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REALTIME SSE & SYNC TRIGGER
// ==========================================

app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sheetsService.addSseClient(res);

  req.on('close', () => {
    sheetsService.removeSseClient(res);
  });
});

app.post('/api/sync/trigger', authMiddleware, async (req, res) => {
  await sheetsService.sync();
  res.json({
    success: true,
    syncStatus: sheetsService.syncStatus,
    version: sheetsService.versionCursor,
    lastSyncTime: sheetsService.lastSyncTime,
  });
});

// Start Express server and initial Sheets sync
const PORT = CONFIG.PORT;
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(`Requisition System Backend API running on port ${PORT}`);
    console.log(`Target Spreadsheet ID: ${CONFIG.SPREADSHEET_ID}`);
    console.log(`Data Tab: ${CONFIG.DATA_TAB} | Master Tab: ${CONFIG.MASTER_TAB}`);
    console.log(`Formula Protected Columns: ${CONFIG.PROTECTED_FORMULA_COLUMNS.join(', ')}`);
    console.log(`=======================================================`);

    // Start polling service
    sheetsService.startPolling();
  });
}

export default app;
