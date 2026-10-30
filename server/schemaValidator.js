import { CONFIG, idxToCol } from './config.js';

export class SchemaValidator {
  constructor() {
    this.validationReport = null;
    this.activeColumnMap = {};
    this.firmNameColumn = CONFIG.FIRM_NAME_DESTINATION_COLUMN;
    this.isStrictMatch = false;
    this.firmNameConfigured = false;
  }

  /**
   * Validate raw row 6 array of strings against canonical mapping
   * @param {string[]} row6Cells - Raw cell values from row 6
   */
  validateRow6(row6Cells) {
    const report = {
      timestamp: new Date().toISOString(),
      headerRow: CONFIG.HEADER_ROW,
      status: 'OK', // 'OK' | 'WARNING' | 'ERROR'
      mismatches: [],
      detectedHeaders: {},
      resolvedMapping: {},
      formulaProtectionStatus: 'ENFORCED',
      firmNameStatus: {
        configuredColumn: this.firmNameColumn,
        isConfigured: false,
        message: '',
      },
      actionableAdvice: [],
    };

    const detected = {};
    row6Cells.forEach((val, idx) => {
      const colLetter = idxToCol(idx);
      const cleanVal = (val || '').toString().trim();
      if (cleanVal) {
        detected[colLetter] = cleanVal;
      }
    });
    report.detectedHeaders = detected;

    // Check canonical columns A to V
    let exactMatches = 0;
    let expectedCount = Object.keys(CONFIG.CANONICAL_COLUMNS).length;

    for (const [col, info] of Object.entries(CONFIG.CANONICAL_COLUMNS)) {
      const detectedVal = detected[col] || '';
      const cleanExpected = info.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanDetected = detectedVal.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (cleanExpected === cleanDetected) {
        exactMatches++;
        report.resolvedMapping[info.name] = col;
      } else {
        // Mismatch found
        report.mismatches.push({
          col,
          expected: info.name,
          found: detectedVal || '(blank/missing)',
          isProtectedFormula: info.formulaProtected,
        });
      }
    }

    // Check Firm Name column
    const firmColVal = detected[this.firmNameColumn] || '';
    const cleanFirmColVal = firmColVal.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanFirmColVal === 'firmname' || cleanFirmColVal === 'firm') {
      report.firmNameStatus.isConfigured = true;
      this.firmNameConfigured = true;
      report.firmNameStatus.message = `Firm Name column correctly detected at ${this.firmNameColumn}6.`;
      report.resolvedMapping['Firm Name'] = this.firmNameColumn;
    } else {
      report.firmNameStatus.isConfigured = false;
      this.firmNameConfigured = false;
      report.firmNameStatus.message = `Firm Name is required by the form but is absent from sheet headers. Proposed: ${this.firmNameColumn}6. Until confirmed, Firm Name is retained in application storage.`;
      report.actionableAdvice.push(
        `Setup Alert: Propose writing "Firm Name" to header cell ${this.firmNameColumn}6 in Google Sheets to persist firm names directly in the sheet.`
      );
    }

    // Determine overall status
    if (report.mismatches.length > 0) {
      report.status = 'WARNING';
      this.isStrictMatch = false;

      // Check if Description column was inserted (which shifts columns)
      if (detected['D'] && detected['D'].toLowerCase().includes('description')) {
        report.actionableAdvice.push(
          `Detected an inserted "Description" column at D6 in the live sheet. The canonical schema has Amount at D6.`
        );
      }
      report.actionableAdvice.push(
        `Actionable Check: Ensure row 6 headers match the canonical business schema (A: Timestamp, B: RS-Indent No., C: Name Of The Requester, D: Amount, E: Mode, etc.). Writes to formula columns are blocked by the safety allowlist.`
      );
    } else {
      report.status = report.firmNameStatus.isConfigured ? 'OK' : 'WARNING';
      this.isStrictMatch = true;
    }

    // Also build a name-based lookup for safe dynamic mapping
    for (const [col, name] of Object.entries(detected)) {
      report.resolvedMapping[name] = col;
    }

    this.validationReport = report;
    this.activeColumnMap = report.resolvedMapping;
    return report;
  }

  getReport() {
    return this.validationReport;
  }

  setFirmNameColumn(col) {
    this.firmNameColumn = col.toUpperCase().trim();
    if (this.validationReport) {
      this.validationReport.firmNameStatus.configuredColumn = this.firmNameColumn;
    }
  }
}

export const schemaValidator = new SchemaValidator();
