# Requisition Slip Application System

A production-quality React and Node.js business application built for multi-stage requisition management with live Google Sheets synchronization, strict formula preservation, role-based access control, and a design matching the provided visual reference.

---

## 1. Google Sheets Configuration & Schema Reference

- **Target Spreadsheet ID:** `1yfiavHpqcvXZYL4OYRtGcu1tdL_YJIxL8vDH83ErDZI`
- **Data Sheet Tab:** `Sheet1`
- **Master Dropdown Tab:** `Master` (GID: `1970332639`)
- **Rows 1–5:** Workflow Configuration (Preserved without change)
  - Row 1: Spreadsheet timestamp
  - Row 2: What (`Payment Requisition`, `Managment Approvel`, `Posting`, `Get Payment`, `Audit Payments`)
  - Row 3: Who (`Anyone`, `EA`, `Priyank`, `Rahul`)
  - Row 4: How (`By React App`, `By Payment Form`)
  - Row 5: When (`Need`, `1`, `1`, `1`, `1`)
- **Row 6:** Business Column Headers
- **Row 7+:** Business Records

### Exact Canonical Column Mapping
| Col | Field Name | Type | Formula Protected | Stage Assignment |
|---|---|---|---|---|
| **A** | Timestamp | String | No | System generated |
| **B** | RS-Indent No. | Key | No | Stable Business Identifier |
| **C** | Name Of The Requester | Master Dropdown | No | New Request |
| **D** | Amount | Numeric | No | New Request |
| **E** | Mode | Master Dropdown | No | New Request |
| **F** | Payment Location | Master Dropdown | No | New Request |
| **G** | Reason | Text | No | New Request |
| **H** | Any Attchments | URL Link | No | New Request |
| **I** | **Planned** | Formula | **YES (Read-Only)** | Management Approval |
| **J** | **Actual** | Timestamp | No | Management Approval |
| **K** | **Delay** | Formula | **YES (Read-Only)** | Management Approval |
| **L** | **Paid** | Decision | No | Management Approval |
| **M** | **Approved Amount** | Numeric | No | Management Approval |
| **N** | **Planned2** | Formula | **YES (Read-Only)** | Posting |
| **O** | **Actual2** | Timestamp | No | Posting |
| **P** | **Delay2** | Formula | **YES (Read-Only)** | Posting |
| **Q** | **Planned1** | Formula | **YES (Read-Only)** | Get Payment |
| **R** | **Actual1** | Timestamp | No | Get Payment |
| **S** | **Delay1** | Formula | **YES (Read-Only)** | Get Payment |
| **T** | **Planned3** | Formula | **YES (Read-Only)** | Audit Payments |
| **U** | **Actual3** | Timestamp | No | Audit Payments |
| **V** | **Delay3** | Formula | **YES (Read-Only)** | Audit Payments |
| **W** | **Firm Name** | Master Dropdown | No | Proposed setup column `W6` |

> **IMPORTANT:**
> - `K` is Delay, `L` is Paid.
> - `L = Yes` does not signify payment completion; payment execution is confirmed only when Rahul records `Actual1` in Column `R`.
> - Columns `I, K, N, P, Q, S, T, V` are owned exclusively by spreadsheet formulas. Writes to these columns are blocked by an explicit backend write allowlist.
> - **Firm Name Setup:** Firm Name is required by the form but absent from A:V. The application proposes `W6 = Firm Name`. Until configured, the setup warning is displayed and Firm Name is safely persisted in the backend database rather than silently discarded.

---

## 2. Master Dropdowns (Read Directly from Master Tab)

Dropdowns are dynamically loaded from GID `1970332639` (`Master` tab):
- **Name Of The Requester:** Vivek Mishra, Hareram Maurya, Suryakant Verma, Prince Nagpal, Uttam Sahu (Truck), Sanjay Singh
- **Firm Name:** Pmmpl, Rkl, Refrasynth, Refratech, Purab
- **Payment Location:** Party Account, Personal Account
- **Mode:** UPI, IMPS, NEFT, RTGS, ECS / NACH, Cash, Cheque

---

## 3. Authentication & User Credentials

The system implements JWT-based authentication with bcrypt-hashed passwords and user-wise access control:

| Username | Password | Role | Access Scope |
|---|---|---|---|
| `vivek` | `vivek123` | Requester | Can create requisitions and view only their own requests |
| `hareram` | `hareram123` | Requester | Scoped exclusively to Hareram Maurya's requests |
| `suryakant` | `suryakant123` | Requester | Scoped exclusively to Suryakant Verma's requests |
| `ea` | `ea123` | EA / Management | Management Approval queue (updates J, L, M) |
| `priyank` | `priyank123` | Posting | Accounting Posting queue (updates O) |
| `rahul` | `rahul123` | Payment | Payment Processing queue (updates R) |
| `auditor` | `auditor123` | Auditor | Payment Audit queue (updates U) |
| `admin` | `admin123` | Admin | Complete access, configuration, and schema management |

---

## 4. Visual Design Language (Matching Reference Image)

- **Outer Background:** Deep forest-green ambient canvas (`#142217`) with layered concentric rings and mouse-tracked parallax (capped at 6px, animation-frame scheduled, disabled on touch/reduced-motion).
- **Main Floating Surface:** Large warm-white card container (`#fcfdfc`) with generous rounded corners (`28px`), multi-layer soft drop shadows.
- **Navigation Controls:** Pill-shaped navigation bar in mint and sage green (`#dce7d9`, `#88a383`, `#2a472f`).
- **Typography:** Calibri with modern system fallbacks, tabular figures (`font-variant-numeric: tabular-nums`) for currency and dates.
- **Form Modal:** Soft bubble-style modal expanding with short spring animation, focus trapping, and Escape key handling.
- **Unified Status Badges:** Pending, Completed, Overdue, Not Started matching card counters and table filters.

---

## 5. Setup & Running Locally (Windows PowerShell)

### Prerequisites
- Node.js v18+ (tested on Node v24.19)
- npm v10+

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Configure Environment
Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

### Step 3: Start Application (Backend + Frontend)
```powershell
npm run dev
```
- Backend API: `http://localhost:3001`
- Frontend UI: `http://localhost:5173` (or `5174`)

### Run Automated Verification Test Suite
```powershell
npm test
```

### Production Build
```powershell
npm run build
```

---

## 6. Verification Test Suite & Performance Measurements

Executed via `test/suite.cjs` across 12 automated test cases:

```text
===============================================================
  REQUISITION SLIP APPLICATION SYSTEM - VERIFICATION TEST SUITE
===============================================================

--- 1. Formula Preservation & Row Allocation Tests ---
  ✔ Protected formula columns list contains exactly I, K, N, P, Q, S, T, V
  ✔ Backend write allowlist strictly excludes all formula columns
  ✔ Simulated isolated sheet with 1000+ formula rows correctly allocates row after data

--- 2. Workflow & Stage Transition Integrity Tests ---
  ✔ Full 4-stage lifecycle: New -> Approval (J/L/M) -> Posting (O) -> Payment (R) -> Audit (U)
  ✔ Stage prerequisites: Posting before approval or payment before posting is rejected
  ✔ Approval exceed check: Approved amount > requested requires reason

--- 3. Concurrency, Row Shuffling & Identity Tests ---
  ✔ Simultaneous concurrent submissions (50 parallel) receive distinct IDs with 0 collisions
  ✔ Row resolving by RS-Indent No. is resilient to row sorting/reordering in sheet
  ✔ Optimistic locking: Concurrent edits on stale version throw conflict

--- 4. Authentication & User Access Isolation Tests ---
  ✔ Valid credentials return JWT token and verified user profile
  ✔ User isolation: Requester Vivek Mishra cannot see Requester Hareram Maurya records

--- 5. Performance Benchmark with 5,000 Records ---
  ✔ Populate isolated 5,000 records fixture and measure query & filter latency

  --- Benchmark Measurements ---
  Records in Fixture:       5,000 records
  Filter Query (p50):       0.07 ms  (Target: < 300 ms)
  Filter Query (p95):       0.12 ms  (Target: < 300 ms)
  Save Mutation (p50):      1.13 ms  (Target: < 2,000 ms)
  Save Mutation (p95):      1.83 ms  (Target: < 2,000 ms)

===============================================================
  TEST RESULTS: 12 passed, 0 failed of 12 total
===============================================================
```

---

## 7. Status of Live Integration & Credentials

1. **Google Sheets Read (Live & Verified):**
   - Public read access via Google Sheets GVIZ API is connected and verified live against spreadsheet `1yfiavHpqcvXZYL4OYRtGcu1tdL_YJIxL8vDH83ErDZI`.
   - Reads `Sheet1` workflow metadata (Rows 1–5), Row 6 headers, and `Master` tab dropdowns dynamically.
2. **Google Sheets Write (Credential Configuration):**
   - Full Google Service Account integration (`googleapis`) is implemented in `server/sheetsService.js`.
   - To enable live sheet writes: set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` in `.env` and grant Editor permissions on the spreadsheet to the service account.
   - Alternatively, deploy the included Google Apps Script Web App (`server/appsScriptCode.js`) and set `APPS_SCRIPT_URL` in `.env`.
   - If credentials are not provided, the backend operates in synchronized in-memory persistence mode with targeted mutation logging, ensuring complete functionality without breaking.
