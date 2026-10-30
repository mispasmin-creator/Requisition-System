/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - REQUISITION SYSTEM LIVE SYNC ENGINE (v2.1)
 * =========================================================================
 * SPREADSHEET: 1yfiavHpqcvXZYL4OYRtGcu1tdL_YJIxL8vDH83ErDZI
 * TARGET TABS: Sheet1 (Data Tab) & Master (Dropdown Values)
 * =========================================================================
 */

const SHARED_SECRET = 'req-system-secret-key-prod-2026';
// Backend webhook URL for live onEdit events (replace when deploying live/ngrok)
const BACKEND_WEBHOOK_URL = 'http://localhost:3001/api/sync/webhook';

// Target Google Drive folder for attachments (Bills, Invoices, PDFs, Images)
const DEFAULT_DRIVE_FOLDER_ID = '1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR';

// Planned & Delay formula-owned columns that MUST NEVER be overwritten (kept 100% safe)
// FMS schema: U=Attachment, W=Actual 4. Only Planned/Delay columns are protected.
const PROTECTED_COLUMNS = ['J', 'L', 'O', 'Q', 'R', 'T', 'V', 'X'];

/**
 * Robust sheet finder (handles case differences, spaces, or defaults to first sheet)
 */
function getTargetSheet(ss, tabName) {
  if (!tabName) return ss.getSheets()[0];
  var sheet = ss.getSheetByName(tabName);
  if (sheet) return sheet;

  var cleanTarget = tabName.toString().trim().toLowerCase();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === cleanTarget) {
      return sheets[i];
    }
  }

  // Fallback to first sheet (GID 0) for main data operations
  if (cleanTarget === 'sheet1' || cleanTarget === 'data' || cleanTarget === 'sheet 1') {
    return sheets[0];
  }
  return null;
}

/**
 * 1. Health check endpoint - test in browser or via API
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets().map(function(s) { return s.getName(); });

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ACTIVE',
    spreadsheetName: ss.getName(),
    sheetsFound: allSheets,
    activeDataSheet: allSheets[0],
    targetDriveFolderId: DEFAULT_DRIVE_FOLDER_ID,
    message: 'Google Apps Script Integration Active & Connected!',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 2. Web App doPost handler - executes live cell updates and Google Drive uploads
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Bad Request: No post body received.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);

    // Security Verification
    if (data.secret !== SHARED_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Unauthorized: Invalid secret key.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: UPLOAD_FILE to designated Google Drive folder
    if (data.action === 'UPLOAD_FILE') {
      var folderId = data.folderId || DEFAULT_DRIVE_FOLDER_ID;
      var targetFolder;
      try {
        targetFolder = DriveApp.getFolderById(folderId);
      } catch (fErr) {
        throw new Error('Google Drive folder error (' + folderId + '): ' + fErr.message);
      }

      var rawBytes = Utilities.base64Decode(data.fileData);
      var mimeType = data.mimeType || 'application/octet-stream';
      var fileName = data.fileName || ('Upload_' + Utilities.formatDate(new Date(), 'GMT+5:30', 'yyyyMMdd_HHmmss'));
      var blob = Utilities.newBlob(rawBytes, mimeType, fileName);

      var createdFile = targetFolder.createFile(blob);
      try {
        createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        console.warn('Sharing error: ' + shareErr.message);
      }

      var fileUrl = createdFile.getUrl();

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: createdFile.getId(),
        fileName: createdFile.getName(),
        fileUrl: fileUrl,
        folderId: folderId,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.tabName || 'Sheet1';
    var sheet = getTargetSheet(ss, sheetName);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Target tab "' + sheetName + '" not found in spreadsheet.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Process cell writes
    if (data.row && data.cells) {
      var targetRow = parseInt(data.row, 10);
      var updatedCells = [];

      for (var colLetter in data.cells) {
        var colUpper = colLetter.toUpperCase();

        // STRICT FORMULA COLUMN PROTECTION (only on main requisition FMS data sheet)
        var isDataTab = (sheet.getName().trim().toLowerCase() === 'fms' || sheet.getName().trim().toLowerCase() === 'sheet1');
        if (isDataTab && PROTECTED_COLUMNS.indexOf(colUpper) !== -1) {
          throw new Error('SECURITY VIOLATION: Attempted write to protected formula column ' + colUpper);
        }

        var value = data.cells[colLetter];
        sheet.getRange(colUpper + targetRow).setValue(value);
        updatedCells.push(colUpper + targetRow);
      }

      // Flush spreadsheet changes immediately
      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        sheetUsed: sheet.getName(),
        updatedRow: targetRow,
        cellsCount: updatedCells.length,
        updatedCells: updatedCells,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      error: 'Missing row or cells payload.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. Realtime OnEdit Trigger
 * Set up via: Triggers (Clock icon) > Add Trigger > onEditHandler > From spreadsheet > On edit
 */
function onEditHandler(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();

  var payload = {
    event: 'SHEET_EDIT',
    sheetName: sheetName,
    row: e.range.getRow(),
    col: e.range.getColumn(),
    value: e.value,
    oldValue: e.oldValue,
    timestamp: new Date().toISOString(),
    secret: SHARED_SECRET
  };

  try {
    UrlFetchApp.fetch(BACKEND_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    console.warn('Backend webhook unavailable: ' + err.toString());
  }
}
