# Higgsfield Integration Verifier Report

**Role:** Independent Verifier (Gemini 3.8 Flash)  
**Mode:** READ ONLY (No files modified, no secrets inspected, no external APIs contacted, no renders/deploys dispatched)  
**Inspected Scope:** Git diff (`.env.example`, `src/app/api/pipeline/run/route.ts`, `src/lib/resume-policy.ts`, `tests/validations.test.ts`), all untracked files (`architecture/higgsfield-api.md`, `src/lib/*`, `tests/*`), and full test suite execution.

---

## 1. Verdict

**VERDICT: CHANGES REQUIRED (FAIL)**

While the architecture exhibits strong design elements (exact numeric quote gating, deterministic canonical JSON hashing, critical persistence prior to paid POSTs, and strict HTTPS origin validation), there are **critical material defects** in the recovery of ambiguous submissions, concurrency windows in the lock-free budget ledger, and missing validation guards that must be fixed before this integration can safely handle paid production traffic.

---

## 2. Compliance Evaluation against Target Goals

| Goal | Status | Analysis Summary |
|---|---|---|
| **1. Existing render flows dispatched to frozen provider/model** | **PASS** | Server-side resolution in `resolveVideoProviderConfig`; client schema discards provider keys; provider/model frozen in job state; cross-provider resumes strictly rejected (`409 RESUME_CONFIG_CONFLICT`). |
| **2. Cumulative durable US$30 cap across jobs/processes/restarts** | **PARTIAL** | Durable on disk in `.tmp/budget_*.json`, integer micros arithmetic; however, concurrent state transitions can overwrite `CHARGED` with `RELEASED`, and env var allows overrides `> 30` without ceiling enforcement. |
| **3. Actual numeric quote before submit** | **PASS** | `POST /estimate/{model}` mandatory; rejects non-numeric or non-estimate responses (Seedance-style) without guessing prices. |
| **4. Durable exact payload / idempotency key before paid POST** | **PASS** | `canonicalJson` ensures stable hashing; critical persistence throws and aborts before `client.submit` is reached. |
| **5. Recover ambiguous submits without duplicate charge** | **FAIL** | If a replay of an unknown submission returns an HTTP 4xx, the ledger reservation is prematurely released and the job is permanently wedged on subsequent resume attempts. |
| **6. Unknown outcomes retain reserves** | **PARTIAL** | Retained on initial submission network failure; violated if replay returns an HTTP 4xx. |
| **7. Fail closed** | **PARTIAL** | Fails closed on untrusted URLs, redirects, and missing quotes; fails open on corrupt/unknown ledger record states (silently treated as $0). |
| **8. Legacy hashes / provider behavior preserved** | **PASS** | `pipelineConfigHash` without provider remains 100% byte-identical; Replicate fallback intact when `VIDEO_PROVIDER` is empty/unset. |
| **9. No UI changes** | **PASS** | Zero frontend/component/CSS files modified. Only backend libraries and API routes touched. |

---

## 3. Concrete Material Findings

### Finding 1 (Critical Bug): HTTP 4xx on Replay of Ambiguous Submission Permanently Bricks Job with `RESERVE_CONFLICT`

- **Files & Lines:** `src/lib/higgsfield-scene.ts` (lines 414–427), `src/app/api/pipeline/run/route.ts` (lines 901–911), `src/lib/cost-ledger.ts` (lines 279–282).
- **Description:**  
  When an initial submission fails ambiguously (e.g. network timeout), `providerRequests[sceneId]` is persisted with `requestId = null` and `attempt = 1`.  
  On resume, `planHiggsfieldRecovery` triggers `resubmitHiggsfieldScene` with the same key.  
  If the provider rejects the replay with a 4xx (e.g. HTTP 409 Conflict, 422 Unprocessable, or 400 Bad Request):
  1. `resubmitHiggsfieldScene` calls `releaseCost({ operationKey, reason: 'submission_rejected_no_generation' })`, changing the ledger state to `RELEASED`.
  2. It throws `HiggsfieldSceneError('SUBMISSION_REJECTED')`.
  3. In `route.ts`, the catch block rethrows without clearing or incrementing `providerRequests[sceneId]`.
  4. On any subsequent resume call, `planHiggsfieldRecovery` again routes to `resubmit_same_key`.
  5. `resubmitHiggsfieldScene` calls `reserveCost`, which calls `adoptExisting`.
  6. `adoptExisting` sees `existing.state === 'RELEASED'` and returns `{ kind: 'conflict', reason: 'KEY_RELEASED_USE_NEW_ATTEMPT' }`.
  7. `resubmitHiggsfieldScene` throws `RESERVE_CONFLICT`.
- **Reproduction:**  
  1. Create scene record with `requestId = null`, `attempt = 1`, and reservation in state `RESERVED`.  
  2. Mock `client.submit` to reject with `SubmissionRejectedError(400)`.  
  3. Call `resubmitHiggsfieldScene` (fails with `SUBMISSION_REJECTED`; ledger becomes `RELEASED`).  
  4. Call `resubmitHiggsfieldScene` again (simulate next operator resume).  
  5. **Result:** Throws unrecoverable `RESERVE_CONFLICT`. Job cannot ever be resumed.
- **Remediation:**  
  On 4xx during replay of an ambiguous submission, do not assume no generation was created. If confirmed terminal, `providerRequests[sceneId]` must be deleted or its attempt counter incremented before throwing, allowing the next resume to execute a clean new attempt.

---

### Finding 2 (Financial Flaw): 4xx on Replay of Ambiguous Submission Releases Ledger Funds, Violating "Unknown Outcomes Retain Reserves"

- **Files & Lines:** `src/lib/higgsfield-scene.ts` (lines 414–420).
- **Description:**  
  When an initial POST drops after reaching the provider, the generation may have been accepted and queued. On an idempotent replay, many gateways respond with HTTP 409 (Conflict) or 422 rather than returning the original 200 payload. Marking the reservation `RELEASED` under reason `submission_rejected_no_generation` clears the reserve from the cumulative $30 ledger. If the operator subsequently forces a re-render, a second paid generation is dispatched while the first is billed externally, bypassing the durable US$30 cap.
- **Remediation:**  
  Replays of *previously ambiguous* submissions that return 4xx must fail closed to `PROVIDER_UNKNOWN` and retain the reservation until manual reconciliation or definitive status query resolves it.

---

### Finding 3 (Concurrency Defect): Lock-Free `reserveCost` Same-Key Adoption Window Can Adopt Unverified/Rolled-Back Reservations

- **Files & Lines:** `src/lib/cost-ledger.ts` (lines 234–268 and lines 271–287).
- **Description:**  
  In `reserveCost`, Process 1 creates the file `budget_<digest>.json` atomically with state `RESERVED` and then performs `scanLedger(ledgerDir)` to verify whether `committed > capMicros`.  
  If Process 2 invokes `reserveCost` for the same key during Process 1's scan:
  1. Process 2 sees the file exists and calls `adoptExisting`.
  2. `adoptExisting` returns `{ kind: 'existing', reservation }` immediately without verifying that the budget scan passed.
  3. Process 1 completes `scanLedger`, detects `committed > capMicros`, unlinks `filePath`, and returns `budget_exceeded`.
  4. Process 2 proceeds with a paid submission using an unverified, deleted reservation.
  5. Furthermore, if Process 2 attempts `readRecord` at the exact instant Process 1 executes `unlinkSync`, it receives ENOENT and returns `{ kind: 'ledger_corrupt' }`, causing false corruption locks.
- **Remediation:**  
  Write pending reservations to a staging state or verify that the reservation exists and remains valid post-scan, or use file locking / transactional verification during adoption.

---

### Finding 4 (Data Race): Non-Atomic `chargeCost` vs `releaseCost` State Transitions Permit `RELEASED` to Overwrite `CHARGED`

- **Files & Lines:** `src/lib/cost-ledger.ts` (lines 290–334 and lines 105–113).
- **Description:**  
  `chargeCost` and `releaseCost` perform read-modify-write operations via `writeRecordAtomic` without mutual exclusion or compare-and-swap (CAS).  
  If Worker A (handling a successful polling completion) calls `chargeCost` concurrently with Worker B (GET reconciliation or timeout handler) calling `releaseCost`:
  - Both read the record in state `RESERVED`.
  - Both prepare their updates.
  - If `releaseCost` finishes second, it overwrites the `CHARGED` record with `RELEASED`.
  - Once marked `RELEASED`, the amount is excluded from `scanLedger` calculations and pruned after 7 days, causing actual billed dollars to vanish from the $30 cap accounting.
- **Remediation:**  
  Implement an atomic transition check (e.g. conditional rename, lockfile, or verify-before-rename) ensuring a `CHARGED` state can never be clobbered by `RELEASED`.

---

### Finding 5 (Robustness / Fail-Closed Flaw): Ledger Records with Unknown States or Invalid Amounts Silently Disappear from Budget Calculations

- **Files & Lines:** `src/lib/cost-ledger.ts` (lines 87–102 and lines 158–163).
- **Description:**  
  In `readRecord`, the only check on `record.state` is `typeof record?.state !== 'string'`.  
  If a record contains an unrecognized state (e.g. `"PENDING"`, `"UNKNOWN"`), `readRecord` returns `{ ok: true }`.  
  In `scanLedger`:
  ```typescript
  if (parsed.record.state === 'RESERVED') reservedMicros += amount;
  if (parsed.record.state === 'CHARGED') chargedMicros += amount;
  ```
  Any state other than `'RESERVED'` or `'CHARGED'` is not added to `corrupt` and contributes $0 to committed funds.  
  Similarly, if `amountMicros` is negative or `NaN`, `Math.max(0, ...)` silently coerces it to 0 instead of flagging corruption.
- **Remediation:**  
  Explicitly validate `record.state` against `['RESERVED', 'CHARGED', 'RELEASED']` and require `Number.isSafeInteger(record.amountMicros) && record.amountMicros > 0`. Mark any deviating file as corrupt.

---

### Finding 6 (Cap Guard): `HIGGSFIELD_INITIAL_TEST_CAP_USD` Lacks Ceiling Enforcement for Initial Test Phase

- **Files & Lines:** `src/lib/cost-ledger.ts` (lines 350–358).
- **Description:**  
  The architectural mandate fixes the initial test cap at US$30.00 accumulated.  
  `budgetCapMicrosFromEnv` parses `HIGGSFIELD_INITIAL_TEST_CAP_USD`, but accepts any positive number (e.g. `500` or `1000`) without an upper ceiling check or safety warning, permitting inadvertent bypass of the $30 test budget.
- **Remediation:**  
  Enforce `micros <= 30 * MICRO_PER_USD` unless an explicit override flag (e.g. `HIGGSFIELD_ALLOW_CAP_OVERRIDE=1`) is set.

---

### Finding 7 (Model Governance): Absence of Model Allowlist for Frozen Kling Phase

- **Files & Lines:** `src/lib/video-provider.ts` (lines 18, 40–46).
- **Description:**  
  `resolveVideoProviderConfig` validates `HIGGSFIELD_MODEL` using a generic ASCII regex (`MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/`).  
  `buildHiggsfieldPayload` hardcodes Kling-specific parameters (`cfg_scale: 0.5`, `multi_shots: false`, `sound: 'on' | 'off'`). If an operator configures another model (e.g. `bytedance/seedance-2.5/image-to-video`), Kling parameters are dispatched to a model with an incompatible schema.
- **Remediation:**  
  Validate that `HIGGSFIELD_MODEL` matches the allowlist for this phase (`kling-video/v3.0/pro/image-to-video` or `^kling-video/`).

---

## 4. Preexisting Codebase Observations

1. **`workerInstanceId` Check on GET (`route.ts` line 1594):**  
   GET marks running jobs as `FAILED` with `WORKER_RESTARTED` whenever `jobData.workerInstanceId !== workerInstanceId`. This is preexisting logic from BK-16/BK-17 designed for single-process Next.js server restarts. In multi-worker/serverless environments, this can misidentify active jobs on sibling workers as dead. The Higgsfield integration adhered to this existing pattern.
2. **`pipelineConfigHash` Hash Stability:**  
   The addition of the optional provider parameter cleanly isolates Higgsfield while preserving exact byte-for-byte legacy hashes for Replicate.

---

## 5. Summary Action Items for Builder

1. **Fix Resubmit 4xx Handling:** In `resubmitHiggsfieldScene` and `route.ts`, treat 4xx on replayed submissions as ambiguous (`PROVIDER_UNKNOWN`) or clean up `providerRequests[sceneId]` so subsequent resumes do not encounter `RESERVE_CONFLICT`.
2. **Harden Concurrent Transitions in `cost-ledger.ts`:** Prevent `RELEASED` from overwriting `CHARGED` using atomic check-and-swap or lockfile semantics.
3. **Close Same-Key Adoption Window:** Prevent `adoptExisting` from returning an active reservation while its creator process is still verifying the budget.
4. **Strict Validation in `readRecord`:** Flag unrecognized ledger states and non-positive amounts as corrupt entries.
5. **Add Cap Ceiling & Model Allowlist:** Enforce the $30 maximum ceiling in `budgetCapMicrosFromEnv` and restrict `HIGGSFIELD_MODEL` to confirmed Kling models.