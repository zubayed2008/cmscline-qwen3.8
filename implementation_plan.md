# Implementation Plan — Phase 18: Core Financial Accounting Engine

## Overview

Add a **double-entry financial accounting engine** to the Enterprise CMS as **Phase 18**: Chart of Accounts → immutable Journal Entries → Postings, Accounts Receivable (customers, invoices, payments), Accounts Payable (vendors, bills, payments), fiscal periods, financial reports (General Ledger, Trial Balance, P&L, Balance Sheet, AR/AP aging), idempotent transactional writes, and an Admin UI — implemented strictly per `ACCOUNTING-IMPLEMENTATION-SPEC.md` (the authoritative accounting contract; no invented accounting behavior) on top of the project's existing Next.js 16 App Router + Mongoose MVC conventions.

Scope & context: the module is **self-contained** in dedicated folders (`src/models/accounting`, `src/services/accounting`, `src/utils/accounting`, `src/app/api/accounting/**` plus spec §22 root endpoints `/api/{invoices,payments,vendors,bills}`, `src/app/admin/(dashboard)/accounting`). Existing content models/services are untouched. Delivery is split into **7 independently verifiable Parts** (mirroring the spec roadmap §33) which the owner triggers **one at a time**; each Part ends green (`tsc --noEmit`, ESLint on touched files, `npm test`, `npm run build`) and is committed separately before the next begins.

### Locked Design Decisions (owner-approved — see future-plan.md Phase 18)

| Decision | Value |
|---|---|
| Atomicity | MongoDB multi-document sessions/transactions when the deployment supports them (`withFinancialTransaction` helper); standalone-dev fallback allowed only while `REQUIRE_DB_TRANSACTIONS=false` (loud warning + best-effort compensation); production must run a replica set |
| Journal lifecycle | Full state machine `DRAFT → PENDING_APPROVAL → APPROVED → POSTED → REVERSED`; POSTED = immutable |
| Corrections | Reversal/contra entries only — never edit/delete posted records |
| Monetary storage | Mongoose `Decimal128` at rest; `decimal.js` for arithmetic; scale 2, **half-up**, centralized in `money.ts`; JS floats prohibited; money crosses API/UI boundaries as validated decimal **strings** |
| Tax | Tax-exclusive v1: per-line `taxRate %`, computed `taxAmount`, credited to seeded `2200 Tax Payable` |
| Basis / Currency | Accrual · single base currency via `ACCOUNTING_BASE_CURRENCY` (default `USD`) stored explicitly on documents |
| Fiscal periods | Calendar-year 12 monthly periods, seeded OPEN for the current year; close/reopen audited; posts only into OPEN |
| Numbering | `JE\|INV\|PAY\|BILL-YYYY-######` via atomic counters collection, annual reset, never reused |
| Sub-ledgers | Shared control accounts `1200 AR` / `2100 AP`; `customerId`/`vendorId` stamped on relevant postings |
| Authorization | Existing `requireAdmin` enforced server-side now; `ACCOUNTING_PERMISSIONS` granular constants defined as the expansion seam |
| Idempotency | `Idempotency-Key` header honored on financial mutations (post, reverse, issue, record payment); duplicates return original result |

## Types

**New file `src/types/accounting-types.ts`** — domain unions and document interfaces:

- `AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'`
- `NormalBalance = 'Debit' | 'Credit'` + `NORMAL_BALANCE_BY_TYPE: Record<AccountType, NormalBalance>` (Asset/Expense→Debit; rest→Credit)
- `JournalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'POSTED' | 'REVERSED'`
- `InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'VOIDED'`
- `BillStatus = 'DRAFT' | 'APPROVED' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'`
- `PeriodStatus = 'OPEN' | 'CLOSED'`; `PartyStatus = 'ACTIVE' | 'INACTIVE'`
- `PaymentType = 'CUSTOMER' | 'VENDOR'`
- `AccountingSourceType = 'MANUAL' | 'OPENING_BALANCE' | 'INVOICE' | 'CUSTOMER_PAYMENT' | 'VENDOR_BILL' | 'VENDOR_PAYMENT'`
- `AccountingErrorCode` = full spec §26 union (`JOURNAL_UNBALANCED`, `ACCOUNT_NOT_POSTABLE`, `ACCOUNT_INACTIVE`, `PERIOD_CLOSED`, `ENTRY_ALREADY_POSTED`, `ENTRY_ALREADY_REVERSED`, `DOCUMENT_NOT_EDITABLE`, `PAYMENT_EXCEEDS_BALANCE`, `PAYMENT_ALLOCATION_EXCEEDS_AMOUNT`, `DUPLICATE_IDEMPOTENCY_KEY`, `TRANSACTION_UNSUPPORTED`, …)
- Document interfaces mirroring every schema below: `IAccount`, `IAccountingPeriod`, `IDocumentCounter`, `IJournalEntry`, `IPosting`, `ICustomer`, `IVendor`, `IInvoiceLine`, `IInvoice`, `IPaymentAllocation`, `IPayment`, `IVendorBill`, `IIdempotencyRecord`
- Report types: `ILedgerRow`, `ITrialBalanceRow`, `ITrialBalance`, `IProfitLoss`, `IBalanceSheetSection`, `IBalanceSheet`, `IAgingBucket`, `IAgingReport`
- `ACCOUNTING_PERMISSIONS` const object (11 keys from spec §21) + `hasAccountingPermission(role)` mapping every permission → Admin (documented expansion seam)

**Monetary representation rule:** all amounts are strings end-to-end (`"1250.50"`). `decimalStringSchema = /^\d+(\.\d{1,2})?$/` in Zod; positive variants for debit/credit/amount fields. Internal math via decimal.js; persistence via `Schema.Types.Decimal128`.

**New file `src/types/accounting-schemas.ts`** (Zod contracts, separate from `schemas.ts` to keep the content-CMS file untouched):
`decimalStringSchema`, `positiveDecimalSchema`, `accountCreateSchema`/`accountUpdateSchema`, `periodActionSchema` (required reason), `journalEntryCreateSchema` (≥2 lines; each line exactly one of `debit|credit > 0`; `accountId` ObjectId string; optional `entryDate`, `reference`, `description`), `journalReverseSchema` (`reason` 3–500 chars required), `customerSchema`, `vendorSchema`, `invoiceCreateSchema` (≥1 line: `description`, `quantity>0`, `unitPrice≥0`, `taxRate 0–100`, `revenueAccountId`; totals computed **server-side only**), `invoiceCancelSchema`, `paymentCreateSchema` (`amount>0`, `cashAccountId`, optional `allocations[{invoiceId, amount}]` with Σallocations ≤ amount enforced in service), `billCreateSchema` (lines carry `expenseAccountId`), `ledgerQuerySchema` (`from`,`to`,`accountId?`,`journalNumber?`,`page`,`limit`), `agingQuerySchema` (`asOf?`).

**Modified `src/models/index.ts`:** re-export all accounting models alongside existing ones.

## Files

### New — Models (`src/models/accounting/`, all `{ timestamps: true }` + `mongoose.models.X || mongoose.model()` guard)

| File | Key contents & indexes |
|---|---|
| `counter-model.ts` | `IDocumentCounter { scope:'JE'\|'INV'\|'PAY'\|'BILL', year:number, seq:number }`; unique compound `{scope, year}` |
| `account-model.ts` | `code` (unique, uppercase), `name`, `accountType` enum, `normalBalance` (server-derived), `parentAccountId` self-ref, `level`, `isGroup`, `isPostable` (groups default false), `isActive`, `description`, `createdBy/updatedBy → User`; indexes: `{code:1}` unique, `{parentAccountId:1}`, `{accountType:1}` |
| `accounting-period-model.ts` | `name`, `fiscalYear`, `periodNumber 1–12`, `startDate`, `endDate`, `status`, `closedBy/closedAt`; unique `{fiscalYear, periodNumber}`; non-overlap enforced in service |
| `journal-entry-model.ts` | `journalNumber` unique, `entryDate`, `postingDate?`, `accountingPeriodId`, `description`, `reference?`, `sourceType/sourceId?`, `status`, `totalDebit/totalCredit` Decimal128, `version` (optimistic lock), `createdBy/approvedBy/postedBy` + timestamps, `reversalOfEntryId?`, `reversalReason?`; indexes `{status:1, entryDate:-1}`, `{sourceType:1, sourceId:1}`, `{reversalOfEntryId:1}` |
| `posting-model.ts` | `journalEntryId`, `accountId`, `debitAmount/creditAmount` Decimal128 (**exactly one populated, >0**), `description?`, `customerId?/vendorId?` stamps; indexes `{journalEntryId:1}`, `{accountId:1, createdAt:1}` for ledger scans |
| `customer-model.ts` / `vendor-model.ts` | `code` unique, `name`, `email`, `phone`, `address`, `taxId`, `status` |
| `invoice-model.ts` | `invoiceNumber` unique, `customerId`, dates, `currency` (=base), `subtotal/taxAmount/totalAmount/amountPaid/balanceDue` Decimal128, `status`, embedded `lines[] {description, quantity, unitPrice, taxRate, taxAmount, revenueAccountId, lineTotal}`, `journalEntryId?`, `notes?`, `version`, `createdBy`; index `{customerId:1, status:1}` |
| `payment-model.ts` | `paymentNumber` unique, `paymentType`, `customerId?/vendorId?`, `paymentDate`, `amount`, `cashAccountId`, `reference?`, `status:'COMPLETED'`, embedded `allocations[{invoiceId?, vendorBillId?, allocatedAmount}]`, `journalEntryId`, `createdBy` |
| `vendor-bill-model.ts` | mirror of invoice with vendorId + per-line `expenseAccountId`, bill lifecycle statuses |
| `idempotency-record-model.ts` | `key` unique, `endpoint`, `userId`, `requestHash`, `responseStatus`, `responseBody` Mixed snapshot, `expiresAt` TTL index (24h) |

### New — Utils (`src/utils/accounting/`)

- `money.ts` — decimal.js wrappers: `toMoney(input)` , `moneyToString(d)` (normalized `"0.00"`), `addMoney`, `subMoney`, `mulRateRound(amount, ratePercent)` (half-up, scale 2), `sumMoney(list)`, `compareMoney(a,b)`, `isPositive(d)`, `ZERO_MONEY`. The **only** place decimal.js is imported.
- `api-error.ts` — `AccountingError extends Error { code: AccountingErrorCode; httpStatus }` + `toResponse()` producing the standard `{ success:false, error, code }` envelope via existing response helpers.
- `with-accounting-transaction.ts` — `withFinancialTransaction<T>(fn: (session: ClientSession | null) => Promise<T>): Promise<T>`: if deployment supports sessions → `mongoose.startSession()` + `session.withTransaction` (retry on transient errors); else if `REQUIRE_DB_TRANSACTIONS === 'true'` → throw `TRANSACTION_UNSUPPORTED`; else log one-time loud warning and run with `null` session (documented dev fallback).

### New — Services (`src/services/accounting/`, static-method classes following `PageService` pattern)

- `number-service.ts` — `nextDocumentNumber(prefix, year, session?)`: atomic `findOneAndUpdate($inc seq)` upsert on Counter → `JE-2026-000001`.
- `period-service.ts` — `seedCurrentYearPeriods()`, `getOpenPeriodFor(date, session?)` (throws `PERIOD_CLOSED`), `closePeriod(id, userId, reason)`, `reopenPeriod(id, userId, reason)` (both audited), `listPeriods(fiscalYear?)`.
- `account-service.ts` — `createAccount`, `updateAccount` (derive `normalBalance`; forbid type change once postings exist), `deactivateAccount` (reject if referenced by postings — soft-delete only), `listAccounts({ flat | tree })`, shared validator `getPostableAccount(accountId, session?)` enforcing exists + postable + active.
- `journal-service.ts` — lifecycle: `createDraft(input, ctx)`, `updateDraft` (DRAFT only; recompute totals; version bump), `submitForApproval`, `approve`, `post(id, ctx)` inside `withFinancialTransaction`: reload → status gate → period-open gate → per-line account postability/active checks → `sum(debits) == sum(credits)` check → insert JE + all postings atomically; `reverse(id, reason, ctx)` creates the mirrored entry (swapped Dr/Cr, new number, cross-linked `reversalOfEntryId`) in one transaction; `deleteDraft`; `list/get` with status/date/source filters. Every transition writes an audit event via existing AuditService.
- `ledger-service.ts` — `getGeneralLedger(filters)` (per-account running balance), `trialBalance(asOf?)`, `profitLoss(from,to)`, `balanceSheet(asOf?)` (+ sanity warn if A ≠ L+E from current-net income plug), `arAging(asOf?)` / `apAging(asOf?)` with buckets Current/1–30/31–60/61–90/90+ by due date. **All reports aggregate posted Postings only** (spec §2.3).
- `customer-service.ts` / `vendor-service.ts` — CRUD + `deactivate` (no hard delete when referenced).
- `invoice-service.ts` — `createDraft` (server computes line totals & tax half-up, tax-exclusive), `issue(id, ctx)` tx: DRAFT→ISSUED + JE `Dr AR total / Cr Revenue subtotal / Cr Tax Payable tax`, `cancel/void` rules (pre-post only, or auto-reversing JE when unpaid-posted), `applyPaymentAllocation(...)` shared with payment flow (updates `amountPaid/balanceDue/status` incl. PARTIALLY_PAID→PAID).
- `payment-service.ts` — `recordCustomerPayment(input, ctx)` tx: validate each allocation ≤ invoice `balanceDue` and Σ ≤ payment amount (`PAYMENT_ALLOCATION_EXCEEDS_AMOUNT` / `PAYMENT_EXCEEDS_BALANCE`) → create Payment+allocations → JE `Dr Cash / Cr AR` → update invoices; `recordVendorPayment(input, ctx)` tx: `Dr AP / Cr Cash` against bills.
- `bill-service.ts` — `createDraft`, `approve` (DRAFT→APPROVED), `post` (APPROVED→POSTED, tx JE `Dr Expense lines (+tax to Tax Payable) / Cr AP`), `cancel` (pre-post only), `applyVendorPayment`.
- `idempotency-service.ts` — `acquire(key, endpoint, requestHash)` (throws `DUPLICATE_IDEMPOTENCY_KEY` on hit), `complete(key, status, body)`, lazy purge of expired keys.

### New — API routes (every route: `requireAdmin()` → Zod parse → service call → `successResponse`/`handleError`; honor `Idempotency-Key` where marked 🔑; Next.js 16 dynamic params awaited as `Promise<{id}>` like existing `[id]` routes)

```
src/app/api/accounting/accounts/route.ts            GET, POST
src/app/api/accounting/accounts/[id]/route.ts       GET, PATCH (edit/deactivate/reactivate)
src/app/api/accounting/periods/route.ts             GET, POST (seed current year)
src/app/api/accounting/periods/[id]/close/route.ts  POST
src/app/api/accounting/periods/[id]/reopen/route.ts POST
src/app/api/accounting/journal-entries/route.ts         GET, POST
src/app/api/accounting/journal-entries/[id]/route.ts    GET, PATCH(DRAFT), DELETE(DRAFT)
src/app/api/accounting/journal-entries/[id]/submit/route.ts   POST
src/app/api/accounting/journal-entries/[id]/approve/route.ts  POST
src/app/api/accounting/journal-entries/[id]/post/route.ts     POST 🔑
src/app/api/accounting/journal-entries/[id]/reverse/route.ts  POST 🔑
src/app/api/accounting/ledger/route.ts              GET
src/app/api/accounting/trial-balance/route.ts       GET
src/app/api/accounting/profit-loss/route.ts         GET
src/app/api/accounting/balance-sheet/route.ts       GET
src/app/api/accounting/ar-aging/route.ts            GET
src/app/api/accounting/ap-aging/route.ts            GET
src/app/api/invoices/route.ts                       GET, POST
src/app/api/invoices/[id]/route.ts                  GET, PATCH(DRAFT)
src/app/api/invoices/[id]/issue/route.ts            POST 🔑
src/app/api/invoices/[id]/cancel/route.ts           POST
src/app/api/payments/route.ts                       GET, POST 🔑
src/app/api/vendors/route.ts                        GET, POST
src/app/api/vendors/[id]/route.ts                   GET, PATCH
src/app/api/bills/route.ts                          GET, POST
src/app/api/bills/[id]/route.ts                     GET, PATCH(DRAFT)
src/app/api/bills/[id]/approve/route.ts             POST
src/app/api/bills/[id]/cancel/route.ts              POST
```

### New — Admin UI (Server Component pages fetch via services; Client Components only for forms/actions)

- `src/app/admin/(dashboard)/accounting/page.tsx` — Financial dashboard: Cash/Bank, AR, AP, Tax Payable balance cards + recent journal entries + quick links.
- `accounting/accounts/` — list page (`AccountsTable`), `new/page.tsx` + `[id]/edit/page.tsx` with `_components/AccountForm.tsx`.
- `accounting/journal-entries/` — list, `new/page.tsx`, `[id]/page.tsx` detail; `_components/JournalEntryForm.tsx` (dynamic lines, live Dr=Cr indicator), `JournalEntriesTable.tsx`, `JournalEntryDetail.tsx` (state-appropriate action buttons: Submit / Approve / Post / Reverse-with-reason).
- `accounting/invoices/` — list, new, detail; `_components/InvoiceForm.tsx` (dynamic lines w/ per-line revenue account + tax rate), `RecordPaymentModal.tsx` (allocations across open invoices), `InvoicesTable.tsx`.
- `accounting/bills/` — list, new, detail; `_components/BillForm.tsx`, `BillsTable.tsx`.
- `accounting/customers/page.tsx` + `_components/CustomerForm.tsx`; `accounting/vendors/page.tsx` + `_components/VendorForm.tsx`.
- `accounting/reports/page.tsx` — tabbed server-fetched reports: Trial Balance, P&L, Balance Sheet, AR Aging, AP Aging (+ General Ledger view with filters); `_components/ReportTables.tsx`.
- `accounting/periods/page.tsx` — period list with audited Close/Reopen actions (confirm dialogs).
- Shared presentational: `src/components/features/admin/accounting/StatusBadge.tsx`, `MoneyDisplay.tsx`.
- **Modified:** `src/components/features/admin/AdminSidebar.tsx` — add "Financials" navigation group (Dashboard, Accounts, Journal Entries, Invoices, Bills, Customers, Vendors, Reports, Periods) using lucide-react icons consistent with existing groups.

### New — Scripts, config, docs

- `scripts/seed-accounting.ts` — deterministic seed: exact spec §29 Chart of Accounts (1000/1100/1200/1300, 2000/2100/2200, 3000/3100, 4000/4100, 5000/5100/5200 with group parents non-postable) + current-year 12 OPEN periods; idempotent re-runs; package.json script `"seed:accounting"`.
- `.env.local` additions (documented in future-plan.md): `ACCOUNTING_BASE_CURRENCY=USD`, `REQUIRE_DB_TRANSACTIONS=false`.
- `docs/accounting/ACCOUNTING-API.md` — endpoint/error-code contract (produced in Part 7).
- `memory.md` — Phase 18 progress appended after each Part.

**Deleted / moved files:** none. **Existing files modified:** only `src/models/index.ts` (exports), audit action enum (additive), `AdminSidebar.tsx`, `package.json`.

## Functions

Key new function signatures (files as above):

```ts
// utils/accounting/money.ts
toMoney(input: string | number | Decimal128): Decimal          // parse-only, no rounding
moneyToString(d: Decimal): string                               // fixed scale-2 normalization
addMoney(a: Decimal|string, b: Decimal|string): string
subMoney(a: Decimal|string, b: Decimal|string): string
mulRateRound(amount: Decimal|string, percent: number): string   // half-up @2dp
sumMoney(values: (Decimal|string)[]): string

// utils/accounting/with-accounting-transaction.ts
withFinancialTransaction<T>(fn: (session: ClientSession | null) => Promise<T>): Promise<T>

// services/accounting/number-service.ts
NumberService.nextDocumentNumber(prefix: DocPrefix, year: number, session?: ClientSession | null): Promise<string>

// services/accounting/journal-service.ts
JournalService.createDraft(input: JournalEntryCreateInput, ctx: AuditContext): Promise<IJournalEntry>
JournalService.post(id: string, ctx: AuditContext): Promise<IJournalEntry>        // transactional
JournalService.reverse(id: string, reason: string, ctx: AuditContext): Promise<IJournalEntry>  // transactional
JournalService.submitForApproval(id, ctx) / approve(id, ctx) / updateDraft(...) / deleteDraft(...)

// services/accounting/invoice-service.ts / payment-service.ts
InvoiceService.issue(id, ctx): Promise<{ invoice; journalEntry }>                 // transactional 🔑
PaymentService.recordCustomerPayment(input, ctx): Promise<{ payment; allocations }> // transactional 🔑

// services/accounting/ledger-service.ts
LedgerService.trialBalance(asOf?: Date): Promise<ITrialBalance>
LedgerService.balanceSheet(asOf?: Date): Promise<IBalanceSheet>
```

Modified functions: none removed or signature-changed in existing code. Additive only: `src/models/index.ts` exports; audit action enum values; `AdminSidebar` nav array.

## Classes

New static-method service classes (pattern matches `PageService`): `AccountService`, `PeriodService`, `NumberService`, `JournalService`, `LedgerService`, `CustomerService`, `VendorService`, `InvoiceService`, `PaymentService`, `BillService`, `IdempotencyService`. New error class `AccountingError extends Error`. Mongoose models follow the existing `mongoose.models.X || mongoose.model()` registration pattern — no other class hierarchy.

## Dependencies

**New package (only one):**

| Package | Version | Purpose |
|---|---|---|
| `decimal.js` | `^10` | All monetary arithmetic (add/sub/mul, `ROUND_HALF_UP`, fixed scale-2). Pairs with native `Decimal128` at rest — convert at the boundaries via `money.ts`. |

```bash
npm install decimal.js
```

**Explicitly NOT added:** no new DB driver (Mongoose's bundled MongoDB driver provides `ClientSession`/transactions), no accounting libraries (behavior is hand-rolled per spec to keep invariants enforceable), no new test tooling (Jest 30 + ts-jest already configured).

## Testing

New suite `src/__tests__/services/accounting/` following the existing mocking pattern (`__tests__/services/version-service.test.ts`: mock `dbConnect`, mock/inspect model methods):

- **`money.test.ts`** — parse/normalize strings, half-up rounding (`mulRateRound(100.005)` → `"100.01"`... verify against spec examples), sum precision, rejection of malformed input.
- **`journal-service.test.ts`** — the spec §31 core matrix: balanced accepted; unbalanced (`Dr 100 / Cr 90`) rejected `JOURNAL_UNBALANCED`; debit-only / credit-only rejected; < 2 postings rejected; non-postable & inactive account rejected; closed-period post rejected; edit of POSTED entry rejected `DOCUMENT_NOT_EDITABLE`; delete-posted rejected; reverse creates opposing entry referencing original while original stays unchanged and ledger stays balanced.
- **`invoice-payment.test.ts`** — issue creates `Dr AR / Cr Revenue(+Tax Payable)`; recordCustomerPayment creates `Dr Cash / Cr AR`, updates `amountPaid`/`balanceDue`/status transitions (`ISSUED → PARTIALLY_PAID → PAID`); over-allocation rejected `PAYMENT_ALLOCATION_EXCEEDS_AMOUNT`; multi-invoice allocation scenario from spec §12.2.
- **`bill-service.test.ts`** — approve/post creates `Dr Expense / Cr AP`; vendor payment creates `Dr AP / Cr Cash`.
- **`ledger-service.test.ts`** — trial balance `ΣDr == ΣCr`; balance sheet `Assets == Liabilities + Equity + NetProfit`; drafts excluded from all reports.
- **`idempotency-service.test.ts`** — same key twice → one financial result, second call returns original outcome.
- Transaction note: tests run the `withFinancialTransaction` callback without a session (helper is session-optional by design), so suites exercise identical service logic; atomicity itself is validated manually against the replica-set dev DB and documented in Part 7.

Per-Part validation gates (every Part, before its commit): `npx tsc --noEmit` · `npx eslint <touched files>` · `npm test` · `npm run build`.

## Implementation Order

Seven independently-triggerable Parts; owner says "start Part N" and nothing beyond it is built. Each Part ends green and is committed separately.

1. **Part 1 — Foundation:** install `decimal.js`; create `accounting-types.ts`, `accounting-schemas.ts`, `utils/accounting/money.ts`, `utils/accounting/accounting-error.ts`; models `counter`, `account`, `accounting-period`; services `AccountService`, `PeriodService`, `NumberService`; `scripts/seed-accounting.ts` (+ `seed:accounting` script); export models from `models/index.ts`; money/account/period tests.
2. **Part 2 — Core Ledger:** models `journal-entry`, `posting`; `utils/accounting/with-accounting-transaction.ts`; extend audit action enum (APPROVE/POST/REVERSE/CLOSE_PERIOD/REOPEN_PERIOD); `IdempotencyService`; `JournalService` (createDraft → submitForApproval → approve → post 🔑 → reverse 🔑, optimistic-lock on version); API routes `/api/accounting/{accounts,periods,journal-entries…}`; journal tests.
3. **Part 3 — Accounts Receivable:** models `customer`, `invoice` (embedded lines), `payment`, `payment-allocation` (or embedded allocations); services `CustomerService`, `InvoiceService` (issue 🔑 / cancel), `PaymentService.recordCustomerPayment 🔑` (allocations ≤ amount & ≤ invoice balance, inside one transaction); APIs `/api/accounting/customers`, `/api/invoices…`, `/api/payments`; AR tests.
4. **Part 4 — Accounts Payable:** models `vendor`, `vendor-bill`; `VendorService`, `BillService` (approve → post 🔑 → pay 🔑 mirroring AR); APIs `/api/vendors`, `/api/bills…`; AP tests.
5. **Part 5 — Financial Reporting:** `LedgerService` — General Ledger (filters + pagination), Trial Balance, Profit & Loss, Balance Sheet, AR/AP aging; report GET endpoints; report-invariant tests.
6. **Part 6 — Admin UI:** accounting dashboard, accounts CRUD, journal entries list/new/detail with state-machine actions, invoices (+RecordPaymentModal), bills, customers, vendors, tabbed Reports page, Periods close/reopen page; `StatusBadge`/`MoneyDisplay`; AdminSidebar "Financials" group.
7. **Part 7 — Hardening & Docs:** concurrency verification (stale-version update rejected), idempotency end-to-end checks, atomic-failure simulation against replica-set DB, `docs/accounting/ACCOUNTING-API.md`, spec §32 acceptance-criteria sweep, memory.md/future-plan.md status updates.

Cross-cutting rule for every Part: no floats for money, no mutation of posted records, no hard-delete of posted financial documents, server-side auth via `requireAdmin` on every route, Zod validation before any service call.





