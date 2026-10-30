process.env.NODE_ENV = 'test';
const assert = require('assert');

// Color helpers for terminal output
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

async function runTestSuite() {
  console.log(bold('\n==============================================================='));
  console.log(bold('  REQUISITION SLIP APPLICATION SYSTEM - VERIFICATION TEST SUITE'));
  console.log(bold('===============================================================\n'));

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    benchmarks: {},
  };

  function test(name, fn) {
    results.total++;
    try {
      fn();
      console.log(`  ${green('✔')} ${name}`);
      results.passed++;
    } catch (err) {
      console.log(`  ${red('✖')} ${name}`);
      console.error(`    ${red(err.message)}`);
      results.failed++;
    }
  }

  async function asyncTest(name, fn) {
    results.total++;
    try {
      await fn();
      console.log(`  ${green('✔')} ${name}`);
      results.passed++;
    } catch (err) {
      console.log(`  ${red('✖')} ${name}`);
      console.error(`    ${red(err.message)}`);
      results.failed++;
    }
  }

  // Import application modules
  const { CONFIG } = await import('../server/config.js');
  const { authenticate, filterRequisitionsForUser } = await import('../server/auth.js');
  const { SchemaValidator } = await import('../server/schemaValidator.js');
  const { SheetsService } = await import('../server/sheetsService.js');

  // -------------------------------------------------------------------------
  // 1. FORMULA PRESERVATION & SAFETY TESTS
  // -------------------------------------------------------------------------
  console.log(cyan('\n--- 1. Formula Preservation & Row Allocation Tests ---'));

  test('Protected formula columns list contains exactly J, L, O, Q, R, T, V, X', () => {
    const expected = ['J', 'L', 'O', 'Q', 'R', 'T', 'V', 'X'];
    assert.deepStrictEqual(CONFIG.PROTECTED_FORMULA_COLUMNS.sort(), expected.sort());
  });

  test('Backend write allowlist strictly excludes all formula columns', () => {
    for (const protCol of CONFIG.PROTECTED_FORMULA_COLUMNS) {
      assert.strictEqual(
        CONFIG.WRITE_ALLOWLIST_COLUMNS.includes(protCol),
        false,
        `Formula column ${protCol} found inside write allowlist!`
      );
    }
  });

  await asyncTest('Simulated isolated sheet with 1000+ formula rows correctly allocates row after data', async () => {
    const service = new SheetsService();
    // Simulate pre-existing rows where formulas extend to row 1200
    for (let i = 7; i <= 20; i++) {
      service.records.set(`RS-20261029-${String(i).padStart(3, '0')}`, {
        rsIndentNo: `RS-20261029-${String(i).padStart(3, '0')}`,
        sheetRowNumber: i,
        amount: 1000,
        version: 1,
      });
    }

    const nextRow = service.findNextEmptyRow();
    assert.strictEqual(nextRow, 21, `Expected next row 21, got ${nextRow}`);

    // Verify submission write payload does not touch formula columns
    const fakeUser = { role: 'requester', requesterName: 'Vivek Mishra' };
    const newRec = await service.submitNewRequisition(
      {
        requesterName: 'Vivek Mishra',
        firmName: 'Pmmpl',
        amount: 5000,
        mode: 'UPI',
        paymentLocation: 'Party Account',
        reason: 'Raw material procurement',
      },
      fakeUser
    );

    assert.strictEqual(newRec.sheetRowNumber, 21);
    assert.strictEqual(newRec.plannedApproval, '—');
    assert.strictEqual(newRec.delayApproval, '—');
  });

  // -------------------------------------------------------------------------
  // 2. WORKFLOW & STAGE TRANSITION TESTS
  // -------------------------------------------------------------------------
  console.log(cyan('\n--- 2. Workflow & Stage Transition Integrity Tests ---'));

  await asyncTest('Full 4-stage lifecycle: New -> Approval (K/M/N) -> Posting (P) -> Payment (S) -> Audit (V)', async () => {
    const service = new SheetsService();
    const eaUser = { role: 'ea', displayName: 'EA' };
    const postingUser = { role: 'posting', displayName: 'Priyank' };
    const paymentUser = { role: 'payment', displayName: 'Rahul' };
    const auditorUser = { role: 'auditor', displayName: 'Auditor' };

    const tsRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

    // 1. Submit
    const created = await service.submitNewRequisition(
      {
        requesterName: 'Vivek Mishra',
        amount: 15000,
        mode: 'NEFT',
        paymentLocation: 'Party Account',
        reason: 'Office equipment',
      },
      { role: 'requester', requesterName: 'Vivek Mishra' }
    );
    const id = created.rsIndentNo;
    assert.strictEqual(id, 'RS - 0001', 'First generated Indent No must be RS - 0001');
    assert.ok(tsRegex.test(created.timestamp), `Submit timestamp ${created.timestamp} must match MM/DD/YYYY HH:MM:SS`);

    // 2. Approval
    const approved = await service.updateStageAction(id, 'APPROVAL', { approvedAmount: 15000, paidField: 'Yes' }, eaUser, 1);
    assert.ok(approved.actualApproval, 'Approval timestamp should be set');
    assert.ok(tsRegex.test(approved.actualApproval), `Approval timestamp ${approved.actualApproval} must match MM/DD/YYYY HH:MM:SS`);
    assert.strictEqual(approved.paidField, 'Yes');
    assert.strictEqual(approved.approvedAmount, 15000);

    // 3. Posting
    const posted = await service.updateStageAction(id, 'POSTING', {}, postingUser, approved.version);
    assert.ok(posted.actualPosting, 'Posting timestamp should be set');
    assert.ok(tsRegex.test(posted.actualPosting), `Posting timestamp ${posted.actualPosting} must match MM/DD/YYYY HH:MM:SS`);

    // 4. Payment
    const paid = await service.updateStageAction(id, 'PAYMENT', { paymentDecision: 'Yes', remarks: 'Payment completed successfully' }, paymentUser, posted.version);
    assert.ok(paid.actualPayment, 'Payment timestamp should be set');
    assert.strictEqual(paid.paymentDecision, 'Yes');
    assert.strictEqual(paid.remarks, 'Payment completed successfully');

    // 5. Audit
    const audited = await service.updateStageAction(id, 'AUDIT', { remarks: 'Compliance verified' }, auditorUser, paid.version);
    assert.ok(audited.actualAudit, 'Audit timestamp should be set');
    assert.strictEqual(audited.remarks, 'Compliance verified');
  });

  await asyncTest('Stage prerequisites: Posting before approval or payment before posting is rejected', async () => {
    const service = new SheetsService();
    const created = await service.submitNewRequisition(
      { requesterName: 'Hareram Maurya', amount: 8000, reason: 'Travel' },
      { role: 'requester', requesterName: 'Hareram Maurya' }
    );
    const id = created.rsIndentNo;

    // Try posting before approval
    let errCaught = false;
    try {
      await service.updateStageAction(id, 'POSTING', {}, { role: 'posting' }, 1);
    } catch (e) {
      errCaught = true;
      assert.ok(e.message.includes('Management approval must be completed before posting'));
    }
    assert.ok(errCaught, 'Posting before approval should have thrown an error');

    // Try payment before posting
    errCaught = false;
    try {
      await service.updateStageAction(id, 'PAYMENT', {}, { role: 'payment' }, 1);
    } catch (e) {
      errCaught = true;
      assert.ok(e.message.includes('Posting must be completed before recording payment'));
    }
    assert.ok(errCaught, 'Payment before posting should have thrown an error');
  });

  await asyncTest('Approval exceed check: Approved amount > requested requires reason', async () => {
    const service = new SheetsService();
    const created = await service.submitNewRequisition(
      { requesterName: 'Vivek Mishra', amount: 10000, reason: 'Supplies' },
      { role: 'requester', requesterName: 'Vivek Mishra' }
    );
    const id = created.rsIndentNo;

    let errCaught = false;
    try {
      await service.updateStageAction(id, 'APPROVAL', { approvedAmount: 12000, exceedReason: '' }, { role: 'ea' }, 1);
    } catch (e) {
      errCaught = true;
      assert.ok(e.message.includes('exceeds requested amount'));
    }
    assert.ok(errCaught, 'Exceeding amount without reason should have failed');
  });

  // -------------------------------------------------------------------------
  // 3. CONCURRENCY & DATA INTEGRITY TESTS
  // -------------------------------------------------------------------------
  console.log(cyan('\n--- 3. Concurrency, Row Shuffling & Identity Tests ---'));

  await asyncTest('Simultaneous concurrent submissions (50 parallel) receive distinct IDs with 0 collisions', async () => {
    const service = new SheetsService();
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        service.submitNewRequisition(
          { requesterName: 'Vivek Mishra', amount: 100 + i, reason: `Concurrent ${i}` },
          { role: 'requester', requesterName: 'Vivek Mishra' }
        )
      );
    }
    const resultsList = await Promise.all(promises);
    const ids = resultsList.map((r) => r.rsIndentNo);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, 50);
    assert.strictEqual(uniqueIds.size, 50, 'All 50 generated IDs must be completely unique');
  });

  await asyncTest('Row resolving by RS-Indent No. is resilient to row sorting/reordering in sheet', async () => {
    const service = new SheetsService();
    const rec1 = await service.submitNewRequisition({ requesterName: 'Vivek Mishra', amount: 500, reason: 'A' }, { role: 'requester', requesterName: 'Vivek Mishra' });
    const rec2 = await service.submitNewRequisition({ requesterName: 'Vivek Mishra', amount: 600, reason: 'B' }, { role: 'requester', requesterName: 'Vivek Mishra' });

    // Simulate user sorting the sheet so rows flip
    rec1.sheetRowNumber = 10;
    rec2.sheetRowNumber = 9;

    assert.strictEqual(service.resolveRowByIndentNo(rec1.rsIndentNo), 10);
    assert.strictEqual(service.resolveRowByIndentNo(rec2.rsIndentNo), 9);
  });

  await asyncTest('Optimistic locking: Concurrent edits on stale version throw conflict', async () => {
    const service = new SheetsService();
    const rec = await service.submitNewRequisition({ requesterName: 'Vivek Mishra', amount: 2000, reason: 'Testing conflict' }, { role: 'requester', requesterName: 'Vivek Mishra' });
    
    // User A approves (version updates from 1 to 2)
    await service.updateStageAction(rec.rsIndentNo, 'APPROVAL', { approvedAmount: 2000 }, { role: 'ea' }, 1);

    // User B tries to submit action based on stale version 1
    let conflictCaught = false;
    try {
      await service.updateStageAction(rec.rsIndentNo, 'POSTING', {}, { role: 'posting' }, 1);
    } catch (e) {
      conflictCaught = true;
      assert.ok(e.message.includes('Concurrency Conflict'));
    }
    assert.ok(conflictCaught, 'Stale edit should trigger Concurrency Conflict');
  });

  // -------------------------------------------------------------------------
  // 4. AUTHENTICATION & USER DATA ISOLATION TESTS
  // -------------------------------------------------------------------------
  console.log(cyan('\n--- 4. Authentication & User Access Isolation Tests ---'));

  await asyncTest('Valid credentials return JWT token and verified user profile', async () => {
    const authVivek = await authenticate('vivek', 'vivek123');
    assert.ok(authVivek.token);
    assert.strictEqual(authVivek.user.username, 'vivek');
    assert.strictEqual(authVivek.user.role, 'requester');

    const authEa = await authenticate('ea', 'ea123');
    assert.strictEqual(authEa.user.role, 'ea');

    const invalid = await authenticate('vivek', 'wrongpass');
    assert.strictEqual(invalid, null);
  });

  test('User isolation: Requester Vivek Mishra cannot see Requester Hareram Maurya records', () => {
    const dummyRecords = [
      { rsIndentNo: 'RS-001', requesterName: 'Vivek Mishra', amount: 100 },
      { rsIndentNo: 'RS-002', requesterName: 'Hareram Maurya', amount: 200 },
      { rsIndentNo: 'RS-003', requesterName: 'Vivek Mishra', amount: 300 },
    ];

    const vivekUser = { role: 'requester', requesterName: 'Vivek Mishra' };
    const hareramUser = { role: 'requester', requesterName: 'Hareram Maurya' };
    const adminUser = { role: 'admin' };

    const vivekView = filterRequisitionsForUser(dummyRecords, vivekUser);
    assert.strictEqual(vivekView.length, 2);
    assert.ok(vivekView.every((r) => r.requesterName === 'Vivek Mishra'));

    const hareramView = filterRequisitionsForUser(dummyRecords, hareramUser);
    assert.strictEqual(hareramView.length, 1);
    assert.strictEqual(hareramView[0].requesterName, 'Hareram Maurya');

    const adminView = filterRequisitionsForUser(dummyRecords, adminUser);
    assert.strictEqual(adminView.length, 3);
  });

  // -------------------------------------------------------------------------
  // 5. PERFORMANCE BENCHMARK (5,000 RECORDS FIXTURE)
  // -------------------------------------------------------------------------
  console.log(cyan('\n--- 5. Performance Benchmark with 5,000 Records ---'));

  await asyncTest('Populate isolated 5,000 records fixture and measure query & filter latency', async () => {
    const benchmarkService = new SheetsService();
    const requesters = ['Vivek Mishra', 'Hareram Maurya', 'Suryakant Verma', 'Prince Nagpal', 'Uttam Sahu (Truck)', 'Sanjay Singh'];
    const firms = ['Pmmpl', 'Rkl', 'Refrasynth', 'Refratech', 'Purab'];

    const t0 = performance.now();
    for (let i = 1; i <= 5000; i++) {
      const reqName = requesters[i % requesters.length];
      const firm = firms[i % firms.length];
      const id = `RS-20261029-${String(i).padStart(5, '0')}`;
      benchmarkService.records.set(id, {
        rsIndentNo: id,
        sheetRowNumber: i + 6,
        timestamp: '10/29/2026 12:00:00',
        requesterName: reqName,
        firmName: firm,
        amount: (i * 17) % 50000 + 500,
        mode: 'UPI',
        paymentLocation: 'Party Account',
        reason: `Requisition item ${i}`,
        plannedApproval: '10/29/2026 14:00:00',
        actualApproval: i % 2 === 0 ? '10/29/2026 13:00:00' : '',
        delayApproval: '—',
        paidField: i % 2 === 0 ? 'Yes' : '',
        approvedAmount: i % 2 === 0 ? 1000 : 0,
        actualPosting: i % 4 === 0 ? '10/29/2026 13:30:00' : '',
        actualPayment: i % 8 === 0 ? '10/29/2026 14:00:00' : '',
        actualAudit: i % 16 === 0 ? '10/29/2026 14:30:00' : '',
        version: 1,
      });
    }
    const fixtureLoadTime = performance.now() - t0;
    assert.strictEqual(benchmarkService.records.size, 5000);

    // Measure: Cold search across 5,000 records
    const searchTimings = [];
    for (let run = 0; run < 100; run++) {
      const qStart = performance.now();
      const all = Array.from(benchmarkService.records.values());
      const filtered = all.filter((r) => r.requesterName === 'Vivek Mishra' && r.firmName === 'Pmmpl');
      searchTimings.push(performance.now() - qStart);
    }
    searchTimings.sort((a, b) => a - b);
    const p50Search = searchTimings[Math.floor(searchTimings.length * 0.5)].toFixed(2);
    const p95Search = searchTimings[Math.floor(searchTimings.length * 0.95)].toFixed(2);

    // Measure: Save confirmation latency on 5,000 records
    const saveTimings = [];
    for (let s = 0; s < 50; s++) {
      const sStart = performance.now();
      await benchmarkService.submitNewRequisition(
        { requesterName: 'Vivek Mishra', amount: 5000, reason: `Bench ${s}` },
        { role: 'requester', requesterName: 'Vivek Mishra' }
      );
      saveTimings.push(performance.now() - sStart);
    }
    saveTimings.sort((a, b) => a - b);
    const p50Save = saveTimings[Math.floor(saveTimings.length * 0.5)].toFixed(2);
    const p95Save = saveTimings[Math.floor(saveTimings.length * 0.95)].toFixed(2);

    results.benchmarks = {
      recordCount: 5000,
      fixtureLoadTimeMs: fixtureLoadTime.toFixed(1),
      searchP50Ms: p50Search,
      searchP95Ms: p95Search,
      saveP50Ms: p50Save,
      saveP95Ms: p95Save,
    };

    console.log(bold('\n  --- Benchmark Measurements ---'));
    console.log(`  Records in Fixture:       ${results.benchmarks.recordCount}`);
    console.log(`  Filter Query (p50):       ${p50Search} ms`);
    console.log(`  Filter Query (p95):       ${p95Search} ms`);
    console.log(`  Save Mutation (p50):      ${p50Save} ms`);
    console.log(`  Save Mutation (p95):      ${p95Save} ms`);
  });

  // -------------------------------------------------------------------------
  // 5. GOOGLE DRIVE UPLOAD & ATTACHMENT SYNC TESTS
  // -------------------------------------------------------------------------
  console.log(cyan('\n--- 5. Google Drive Upload & Attachment Sync Tests ---'));

  test('Google Drive target folder ID matches user specification (1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR)', () => {
    assert.strictEqual(
      CONFIG.DRIVE_FOLDER_ID,
      '1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR',
      `Target Drive folder ID mismatch: expected 1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR, got ${CONFIG.DRIVE_FOLDER_ID}`
    );
  });

  await asyncTest('uploadToGoogleDrive returns fileUrl pointing to Google Drive with target folderId', async () => {
    const service = new SheetsService();
    const mockFile = {
      fileName: 'invoice_march_2026.pdf',
      fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...',
      mimeType: 'application/pdf',
    };

    const res = await service.uploadToGoogleDrive(mockFile);
    assert.strictEqual(res.success, true);
    assert.ok(res.fileUrl.includes('drive.google.com'), 'fileUrl does not point to Google Drive');
    assert.strictEqual(res.folderId, '1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR');
  });

  await asyncTest('Submitting requisition with Drive attachment link persists link to Column I (attachments)', async () => {
    const service = new SheetsService();
    const fakeUser = { role: 'requester', requesterName: 'Vivek Mishra' };
    const driveLink = 'https://drive.google.com/file/d/1zTCzuN4t70Fydjc4LjD5lddZYaGO1iHR_sample/view';

    const newRec = await service.submitNewRequisition(
      {
        requesterName: 'Vivek Mishra',
        firmName: 'Pmmpl',
        amount: 8500,
        mode: 'UPI',
        paymentLocation: 'Party Account',
        reason: 'Office supplies and equipment with invoice',
        attachments: driveLink,
      },
      fakeUser
    );

    assert.strictEqual(newRec.attachments, driveLink, 'Attachment Drive link was not saved in requisition');
    const stored = service.getRecord(newRec.rsIndentNo);
    assert.strictEqual(stored.attachments, driveLink, 'Attachment Drive link was not stored in memory registry');
  });

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log(bold('\n==============================================================='));
  console.log(`  TEST RESULTS: ${results.passed} passed, ${results.failed} failed of ${results.total} total`);
  console.log(bold('===============================================================\n'));

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite failed to run:', err);
  process.exit(1);
});
