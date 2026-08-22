# Implementation Plan — Phase 18: Core Financial Accounting Engine (PostgreSQL + Drizzle)

## Overview

Add a **double-entry financial accounting engine** to the Enterprise CMS as **Phase 18**: Chart of Accounts → immutable Journal Entries → Postings, Accounts Receivable (customers, invoices, payments), Accounts Payable (vendors, bills, payments), fiscal periods, financial reports (General Ledger, Trial Balance, P&L, Balance Sheet, AR/AP aging), idempotent transactional writes, and an Admin UI — implemented strictly per `ACCOUNTING-IMPLEMENTATION-SPEC.md` (the authoritative accounting contract; no invented accounting behavior).

**Storage pivot (owner-decided):** the accounting module lives entirely in **PostgreSQL 15**, reusing the existing `umami-db` container from `docker-compose.umami.yml` as a dedicated second database `cms_accounting` with its own login role. The ORM is **Drizzle ORM** (owner-picked) on the `pg` (node-postgres) driver, with drizzle-kit-generated SQL migrations committed to the repo. All CMS content, auth, users, media, navigation, and the audit log remain in MongoDB/Mongoose — completely untouched. This eliminates the old replica-set/fallback complexity: Postgres gives real multi-statement ACID transactions out of the box, exact `NUMERIC(18,2)` money, and engine-enforced FK/CHECK/UNIQUE constraints — a materially better fit for a ledger.

Scope & context: the module is self-contained in dedicated folders (`src/db/**` for client+schema, `src/services/accounting/**`, `src/utils/accounting/**`, `src/app/api/accounting/**` plus spec §22 root endpoints `/api/{invoices,payments,vendors,bills}`, `src/app/admin/(dashboard)/accounting`). Existing Mongoose models/services are not modified at all. Delivery is split into **7 independently verifiable Parts** which the owner triggers one at a time ("start Part N"); each Part ends green (`npx tsc --noEmit`, ESLint on touched files, `npm test`, `npm run build`) and is committed separately before the next begins.

### Locked Design Decisions (owner-approved — mirrored in future-plan.md Phase 18)

| Decision | Value |
|---|---|
| Database / ORM | PostgreSQL 15 — dedicated `cms_accounting` DB on the `umami-db` container; **Drizzle ORM** + `pg` driver; drizzle-kit migrations committed |
| Atomicity | Native PG transactions via `runInFinancialTransaction` (wraps `accountingDb.transaction`); no fallback flag — `REQUIRE_DB_TRANSACTIONS` dropped |
| Journal lifecycle | Full state machine `DRAFT → PENDING_APPROVAL → APPROVED → POSTED → REVERSED`; POSTED = immutable |
| Corrections | Reversal/contra entries only — never edit/delete posted records |
| Monetary storage | `NUMERIC(18,2)` columns (Drizzle returns **strings**) + decimal.js arithmetic; scale 2 half-up centralized in `money.ts`; floats prohibited; money crosses API/UI as validated decimal strings |
| Cross-DB references | Mongo `User` ids stored as `text` columns + `createdByName` snapshot (no cross-DB FK); audit trail reuses existing Mongo `AuditService` best-effort outside the PG transaction |
| Tax | Tax-exclusive v1: per-line `%`, computed amount credited to seeded `2200 Tax Payable` |
| Basis / Currency | Accrual · single base currency via `ACCOUNTING_BASE_CURRENCY` (default `USD`) stored explicitly on documents |
| Fiscal periods | Calendar-year 12 monthly periods, seeded OPEN; close/reopen audited; posts only into OPEN |
| Numbering | `JE\|INV\|PAY\|BILL-YYYY-######` via `document_counters` table with `SELECT … FOR UPDATE` inside the caller's transaction, annual reset, never reused |
| Sub-ledgers | Shared control accounts `1200 AR` / `2100 AP`; `customerId`/`vendorId` stamped on relevant postings |
| Authorization | Existing `requireAdmin` on every route; `ACCOUNTING_PERMISSIONS` granular constants defined as expansion seam |
| Idempotency | `Idempotency-Key` header honored on financial mutations (post, reverse, issue, record payment); duplicates return original result via unique-PK insert conflict |

## Types

**Persistence shapes come FROM Drizzle, not hand-written:** each table module exports `export type Account = typeof accounts.$inferSelect` and `export type NewAccount = typeof accounts.$inferInsert` (etc.). `NUMERIC` columns surface as TypeScript `string`; timestamps as `Date`; ids as `string` (uuid PKs).

**New file `src/types/accounting-types.ts`** — domain unions and computed shapes only:

- `DocPrefix = 'JE' | 'INV' | 'PAY' | 'BILL'`
- `AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'`
- `NormalBalance = 'Debit' | 'Credit'` + `NORMAL_BALANCE_BY_TYPE: Record<AccountType, NormalBalance>` (Asset/Expense→Debit; rest→Credit)
- `JournalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'POSTED' | 'REVERSED'` (mirrors the pgEnum values 1:1)
- `InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'VOIDED'`
- `BillStatus = 'DRAFT' | 'APPROVED' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'`
- `PeriodStatus = 'OPEN' | 'CLOSED'`; `PartyStatus = 'ACTIVE' | 'INACTIVE'`; `PaymentType = 'CUSTOMER' | 'VENDOR'`
- `AccountingSourceType = 'MANUAL' | 'OPENING_BALANCE' | 'INVOICE' | 'CUSTOMER_PAYMENT' | 'VENDOR_BILL' | 'VENDOR_PAYMENT'`
- `AccountingErrorCode` — full spec §26 union (`JOURNAL_UNBALANCED`, `ACCOUNT_NOT_POSTABLE`, `ACCOUNT_INACTIVE`, `PERIOD_CLOSED`, `ENTRY_ALREADY_POSTED`, `ENTRY_ALREADY_REVERSED`, `DOCUMENT_NOT_EDITABLE`, `PAYMENT_EXCEEDS_BALANCE`, `PAYMENT_ALLOCATION_EXCEEDS_AMOUNT`, `DUPLICATE_IDEMPOTENCY_KEY`, …)
- Report/computed interfaces: `ILedgerRow`, `ITrialBalanceRow`, `ITrialBalance`, `IProfitLoss`, `IBalanceSheetSection`, `IBalanceSheet`, `IAgingBucket`, `IAgingReport`
- Service input aliases (`JournalEntryCreateInput`, `PaymentCreateInput`, …) derived via `z.infer` from the Zod schemas
- `ACCOUNTING_PERMISSIONS` const object (11 keys, spec §21) + `hasAccountingPermission(role)` mapping every permission → Admin (documented expansion seam)

**Monetary representation rule:** all amounts are strings end-to-end (`"1250.50"`). `decimalStringSchema = /^\d+(\.\d{1,2})?$/` in Zod; positive variants for debit/credit/amount fields. Internal math via decimal.js; persistence via `NUMERIC(18,2)`.

**New file `src/types/accounting-schemas.ts`** (Zod contracts, kept separate from content-CMS `schemas.ts`):
`decimalStringSchema`, `positiveDecimalSchema`, `accountCreateSchema`/`accountUpdateSchema`, `periodActionSchema` (required reason), `journalEntryCreateSchema` (≥2 lines; each line exactly one of `debit|credit > 0`; `accountId` uuid string), `journalReverseSchema` (`reason` 3–500 chars required), `customerSchema`, `vendorSchema`, `invoiceCreateSchema` (≥1 line: `description`, `quantity>0`, `unitPrice≥0`, `taxRate 0–100`, `revenueAccountId`; totals computed **server-side only**), `invoiceCancelSchema`, `paymentCreateSchema` (`amount>0`, `cashAccountId`, optional `allocations[{invoiceId, amount}]` with Σ ≤ amount enforced in service), `billCreateSchema` (lines carry `expenseAccountId`), `ledgerQuerySchema` (`from`,`to`,`accountId?`,`journalNumber?`,`page`,`limit`), `agingQuerySchema` (`asOf?`).

## Files

### New — Infrastructure & configuration

| File | Purpose |
|---|---|
| `docker-compose.umami.yml` **(modify)** | `umami-db` gains: `ports: ['5432:5432']` so the host-run Next.js dev server can connect; volume mount `./docker/postgres-init:/docker-entrypoint-initdb.d:ro`; `healthcheck: pg_isready -U umami` |
| `docker/postgres-init/01-create-accounting-db.sql` **(new)** | Idempotent bootstrap for **fresh volumes**: `CREATE ROLE cms_accounting LOGIN PASSWORD 'change-me-accounting';` then ``CREATE DATABASE cms_accounting OWNER cms_accounting;`` (documented manual `psql` fallback for existing volumes, since init scripts only run on first volume creation) |
| `.env.local` **(modify)** | `ACCOUNTING_DATABASE_URL=postgresql://cms_accounting:change-me-accounting@localhost:5432/cms_accounting` · `ACCOUNTING_BASE_CURRENCY=USD` |
| `drizzle.config.ts` **(new)** | `{ dialect: 'postgresql', schema: './src/db/schema/accounting/index.ts', out: './drizzle', dbCredentials: { url: process.env.ACCOUNTING_DATABASE_URL } }` |
| `drizzle/0000_*.sql` … **(generated)** | drizzle-kit SQL migrations, committed to the repo and applied by `scripts/migrate-accounting.ts` |

### New — Database layer (`src/db/`)

| File | Key contents |
|---|---|
| `src/db/pg-client.ts` | `pg.Pool` (max 10) + `drizzle(pool)` **singleton** cached on `globalThis` (same dev-HMR guard pattern as `dbConnect`); exports `accountingDb`, `type AccountingDB = typeof accountingDb`, `type AccountingTx` (transaction handle type extracted from `AccountingDB['transaction']` callback), and `closeAccountingPool()` for tests/scripts |
| `src/db/schema/accounting/enums.ts` | `pgEnum`s: `account_type`, `normal_balance`, `journal_status`, `invoice_status`, `bill_status`, `period_status`, `party_status`, `payment_type`, `source_type`, `payment_status` — values mirror `accounting-types.ts` 1:1 |
| `src/db/schema/accounting/accounts.ts` | uuid PK; `code` text unique uppercase; `name`; `accountType` enum; `normalBalance` enum (server-derived); `parentAccountId` self-FK nullable; `level` int; `isGroup`/`isPostable`/`isActive` bools (groups default non-postable); `description`; `currency`; `createdBy` text (Mongo ObjectId) + `createdByName` text snapshot; timestamps; indexes on `code` (unique), `parentAccountId`, `accountType` |
| `src/db/schema/accounting/accounting-periods.ts` | `fiscalYear` int, `periodNumber` 1–12, `name`, `startDate`/`endDate` date, `status` enum default OPEN, `closedBy`/`closedByName`/`closedAt`; **unique** `(fiscalYear, periodNumber)`; overlap guarded in service |
| `src/db/schema/accounting/document-counters.ts` | composite PK `(scope, year)`, `seq` int not null default 0 |
| `src/db/schema/accounting/journal-entries.ts` | `journalNumber` unique; `entryDate`, `postingDate?`; `accountingPeriodId` FK; `description`, `reference?`; `sourceType`/`sourceId?`; `status` enum; `totalDebit`/`totalCredit` numeric(18,2) not null; `currency`; `version` int default 1 (optimistic lock); `createdBy`/`createdByName`, `approvedBy?`, `postedBy?`; `reversalOfEntryId` self-FK nullable + `reversalReason?`; indexes `(status, entryDate desc)`, `(sourceType, sourceId)`, `(reversalOfEntryId)` |
| `src/db/schema/accounting/postings.ts` | `journalEntryId` FK (on delete restrict); `accountId` FK; `debitAmount`/`creditAmount` numeric(18,2) nullable + **CHECK** `(debit_amount > 0 AND credit_amount IS NULL) OR (credit_amount > 0 AND debit_amount IS NULL)`; `description?`; `customerId?`/`vendorId?` text stamps; indexes `(journalEntryId)`, `(accountId, createdAt)` for ledger scans |
| `src/db/schema/accounting/customers.ts` / `vendors.ts` | `code` unique, `name`, `email`, `phone`, `address`, `taxId`, `status` enum, timestamps |
| `src/db/schema/accounting/invoices.ts` | `invoiceNumber` unique; `customerId` FK; `issueDate`/`dueDate`; `currency`; `subtotal`/`taxAmount`/`totalAmount`/`amountPaid`/`balanceDue` numeric(18,2); `status` enum; `journalEntryId?` FK; `notes?`; `version`; `createdBy`+name; index `(customerId, status)` |
| `src/db/schema/accounting/invoice-lines.ts` | **Normalized** (not embedded): `invoiceId` FK cascade, `position` int, `description`, `quantity` numeric(18,4), `unitPrice`/`taxRate`/`taxAmount`/`lineTotal` numeric, `revenueAccountId` FK — relational integrity + per-line account FK |
| `src/db/schema/accounting/payments.ts` | `paymentNumber` unique; `paymentType` enum; `customerId?`/`vendorId?`; `paymentDate`; `amount` numeric; `cashAccountId` FK; `reference?`; `status` enum default COMPLETED; `journalEntryId` FK; `createdBy`+name |
| `src/db/schema/accounting/payment-allocations.ts` | `paymentId` FK cascade, `invoiceId?` FK / `vendorBillId?` FK (exactly one, CHECK), `allocatedAmount` numeric; unique `(paymentId, invoiceId)` / `(paymentId, vendorBillId)` |
| `src/db/schema/accounting/vendor-bills.ts` + `vendor-bill-lines.ts` | mirror of invoice/lines with `vendorId` + per-line `expenseAccountId`, bill lifecycle statuses |
| `src/db/schema/accounting/idempotency-records.ts` | `key` text PK; `endpoint`, `userId`, `requestHash`; `responseStatus` int; `responseBody` jsonb; `expiresAt` timestamptz; index on `expiresAt` for purge |
| `src/db/schema/accounting/index.ts` | barrel re-exporting every table + inferred `Account`, `NewAccount`, `JournalEntry`, … type aliases |

### New — Services (`src/services/accounting/`, static-method classes following the existing `PageService` convention)

Every service method takes an optional leading `exec` parameter (`AccountingTx` when called inside a transaction, else the singleton `accountingDb`). Mutating flows wrap themselves in `runInFinancialTransaction`; read-only report queries run straight off the singleton.

| File | Key contents |
|---|---|
| `number-service.ts` | `nextDocumentNumber(exec, prefix, year)`: `SELECT … FOR UPDATE` on `document_counters(scope, year)` then `UPDATE seq = seq + 1 RETURNING` → `JE-2026-000001`. Never reused; annual reset by scoping on year. **Always called inside the caller's transaction** so the row lock matches the financial write. |
| `period-service.ts` | `seedCurrentYearPeriods(exec)` (12 OPEN calendar months, `ON CONFLICT DO NOTHING`), `getOpenPeriodFor(exec, date)` (throws `PERIOD_CLOSED` with period details), `closePeriod(id, userId, reason)` / `reopenPeriod(id, userId, reason)` (audited via Mongo AuditService post-commit), `listPeriods(fiscalYear?)` |
| `account-service.ts` | `createAccount`, `updateAccount` (derive `normalBalance` from type; forbid type change once postings exist), `deactivateAccount` (reject when referenced by postings — soft-delete only; FK is RESTRICT anyway), `listAccounts({ flat \| tree })`, shared validator `getPostableAccount(exec, accountId)` enforcing exists + `isPostable` + active |
| `journal-service.ts` | Lifecycle: `createDraft(input, ctx)`, `updateDraft` (DRAFT only; recompute totals; `version` bump), `submitForApproval`, `approve`, `post(id, ctx)` inside `runInFinancialTransaction`: reload → status gate → open-period gate → per-line `getPostableAccount` checks → `SUM(debit) == SUM(credit)` check → insert JE + all postings + bump counter atomically; `reverse(id, reason, ctx)` creates the mirrored entry (swapped Dr/Cr, own number, `reversalOfEntryId` cross-link) in one transaction; `deleteDraft`; list/get with status/date/source filters |
| `ledger-service.ts` | Pure SQL aggregations over posted postings only: `getGeneralLedger(filters)` (per-account running balance, paginated), `trialBalance(asOf?)` (`GROUP BY account`), `profitLoss(from, to)` (revenue − expense accounts), `balanceSheet(asOf?)` (+ current-year net income plug into Equity; warn if Assets ≠ Liabilities + Equity), `arAging(apAging)(asOf?)` bucketed Current/1–30/31–60/61–90/90+ by due date via `CASE WHEN` date math |
| `customer-service.ts` / `vendor-service.ts` | CRUD + `deactivate` (no hard delete when referenced by invoices/bills/payments) |
| `invoice-service.ts` | `createDraft` (server computes line totals & tax half-up, tax-exclusive), `issue(id, ctx)` tx: DRAFT→ISSUED + JE `Dr 1200 AR total / Cr Revenue subtotal / Cr 2200 Tax Payable tax`; `cancel` rules (pre-post only); `applyPaymentAllocations(exec, …)` shared with payment flow (updates `amountPaid`/`balanceDue`/status incl. PARTIALLY_PAID→PAID) using guarded conditional updates |
| `payment-service.ts` | `recordCustomerPayment(input, ctx)` tx: validate each allocation ≤ invoice `balanceDue` and Σ allocations ≤ amount (`PAYMENT_ALLOCATION_EXCEEDS_AMOUNT` / `PAYMENT_EXCEEDS_BALANCE`) → insert Payment + allocations → JE `Dr Cash / Cr AR` → update invoices; `recordVendorPayment(input, ctx)` tx mirrors with `Dr AP / Cr Cash` against bills |
| `bill-service.ts` | `createDraft`, `approve` (DRAFT→APPROVED), `post` (APPROVED→POSTED tx: JE `Dr Expense lines (+ tax to Tax Payable) / Cr AP`), `cancel` (pre-post only), vendor-payment application mirror |
| `idempotency-service.ts` | `acquire(exec, key, endpoint, requestHash)` — inserts into `idempotency_records` (PK `key`); on conflict returns the stored response snapshot instead of re-executing (`DUPLICATE_IDEMPOTENCY_KEY` only when request hash differs); `complete(key, status, body)`; lazy purge of expired rows |

### New — API routes

Every route: `requireAdmin()` → Zod parse (`accounting-schemas.ts`) → service call → `successResponse` / `handleError` envelope (existing `utils/api-response.ts` conventions); 🔑 = honors `Idempotency-Key` header via IdempotencyService; dynamic params awaited as `Promise<{ id }>` (Next.js 16 convention used by all existing `[id]` routes).

```
src/app/api/accounting/accounts/route.ts            GET, POST
src/app/api/accounting/accounts/[id]/route.ts       GET, PATCH (edit / deactivate / reactivate)
src/app/api/accounting/periods/route.ts             GET, POST (seed current year)
src/app/api/accounting/periods/[id]/close/route.ts  POST
src/app/api/accounting/periods/[id]/reopen/route.ts POST
src/app/api/accounting/customers/route.ts           GET, POST
src/app/api/accounting/customers/[id]/route.ts      GET, PATCH
src/app/api/accounting/vendors/route.ts             GET, POST
src/app/api/accounting/vendors/[id]/route.ts        GET, PATCH
src/app/api/accounting/journal-entries/route.ts              GET, POST
src/app/api/accounting/journal-entries/[id]/route.ts         GET, PATCH(DRAFT), DELETE(DRAFT)
src/app/api/accounting/journal-entries/[id]/submit/route.ts  POST
src/app/api/accounting/journal-entries/[id]/approve/route.ts POST
src/app/api/accounting/journal-entries/[id]/post/route.ts    POST 🔑
src/app/api/accounting/journal-entries/[id]/reverse/route.ts POST 🔑
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
src/app/api/bills/route.ts                          GET, POST
src/app/api/bills/[id]/route.ts                     GET, PATCH(DRAFT)
src/app/api/bills/[id]/approve/route.ts             POST
src/app/api/bills/[id]/cancel/route.ts              POST
```

### New — Admin UI (Server Component pages fetch via services; Client Components only for forms/actions)

- `src/app/admin/(dashboard)/accounting/page.tsx` — Financial dashboard: Cash/Bank, AR, AP, Tax Payable balance cards + recent journal entries + quick links.
- `accounting/accounts/` — list page (`AccountsTable.tsx`), `new/page.tsx` + `[id]/edit/page.tsx` with `_components/AccountForm.tsx`.
- `accounting/journal-entries/` — list, `new/page.tsx`, `[id]/page.tsx` detail; `_components/JournalEntryForm.tsx` (dynamic lines, live Dr=Cr indicator), `JournalEntriesTable.tsx`, `JournalEntryDetail.tsx` (state-appropriate actions: Submit / Approve / Post / Reverse-with-reason).
- `accounting/invoices/` — list, new, detail; `_components/InvoiceForm.tsx` (dynamic lines w/ per-line revenue account + tax rate), `RecordPaymentModal.tsx` (allocations across open invoices), `InvoicesTable.tsx`.
- `accounting/bills/` — list, new, detail; `_components/BillForm.tsx`, `BillsTable.tsx`.
- `accounting/customers/page.tsx` + `_components/CustomerForm.tsx`; `accounting/vendors/page.tsx` + `_components/VendorForm.tsx`.
- `accounting/reports/page.tsx` — tabbed reports: Trial Balance, P&L, Balance Sheet, AR Aging, AP Aging (+ General Ledger with filters); `_components/ReportTables.tsx`.
- `accounting/periods/page.tsx` — period list with audited Close/Reopen actions (confirm dialogs).
- Shared presentational: `src/components/features/admin/accounting/StatusBadge.tsx`, `MoneyDisplay.tsx` (renders decimal strings as-is; never parses to float).
- **Modified:** `src/components/features/admin/AdminSidebar.tsx` — add a "Financials" navigation group (Dashboard, Accounts, Journal Entries, Invoices, Bills, Customers, Vendors, Reports, Periods) using lucide-react icons consistent with existing groups.

### New — Scripts, config & docs

| File | Purpose |
|---|---|
| `docker-compose.umami.yml` (**modify**) | `umami-db` gains `ports: ["5432:5432"]` and mounts `./docker/postgres-init:/docker-entrypoint-initdb.d:ro` so the host-run Next.js dev server can reach Postgres |
| `docker/postgres-init/01-create-accounting-db.sql` (**new**) | Idempotent init executed on **first volume creation**: creates role `cms_accounting` (password from env or literal dev default) and database `cms_accounting`, grants ownership. Umami's own DB/user are untouched |
| `scripts/create-accounting-db.ts` (**new**) | Fallback for **existing** volumes where `init.d` will not re-run: connects with an admin URL (`ACCOUNTING_DB_ADMIN_URL`, default umami superuser DSN), creates role + DB if absent |
| `drizzle.config.ts` (**new**) | dialect `postgresql`, schema `./src/db/schema/accounting/index.ts`, out `./drizzle`, credentials from `ACCOUNTING_DATABASE_URL` |
| `scripts/migrate-accounting.ts` (**new**) | Programmatic `migrate()` from `drizzle-orm/node-postgres/migrator`; wired to `npm run migrate:accounting` (ts-node, same convention as `migrate:i18n-indexes`) |
| `scripts/seed-accounting.ts` (**new**) | Spec §29 Chart of Accounts (1000/1100/1200/1300, 2000/2100/2200, 3000/3100, 4000/4100, 5000/5100/5200 — group parents non-postable) + current-year 12 OPEN periods; idempotent re-runs; script `"seed:accounting"` |
| `.env.local` / `.env.example` (**modify**) | Add `ACCOUNTING_DATABASE_URL=postgresql://cms_accounting:<secret>@localhost:5432/cms_accounting`, `ACCOUNTING_BASE_CURRENCY=USD`, optional `ACCOUNTING_DB_ADMIN_URL`. **Remove** the obsolete `REQUIRE_DB_TRANSACTIONS` idea — native PG transactions make it moot |
| `docs/accounting/ACCOUNTING-API.md` (**new**, Part 7) | Endpoint/error-code contract |
| `memory.md` (**modify**) | Phase 18 progress appended after each Part |

### Modified / deleted files (complete list)

- **Modified:** `docker-compose.umami.yml`, `.env.local`/.env.example, `package.json` (deps + 4 scripts), `src/models/index.ts` is **NOT** touched (no Mongoose models added anymore), `AdminSidebar.tsx`.
- **Deleted from disk during the pivot (recreated in Part 1):** `src/models/accounting-period-model.ts` and `src/models/financial-counter-model.ts` were Mongo drafts — superseded by PG tables, already removed. `src/utils/accounting-error.ts` (also already removed) comes back DB-agnostic under `src/utils/accounting/`.
- **Never touched:** all existing Mongoose models/services/routes, `src/types/schemas.ts`.

## Functions

Key new signatures (complete inventories live in the section tables above; leading `exec` = the `AccountingTx` handle when inside a transaction):

```ts
// src/utils/accounting/with-financial-transaction.ts
runInFinancialTransaction<T>(fn: (exec: AccountingTx) => Promise<T>): Promise<T>

// src/services/accounting/number-service.ts
NumberService.nextDocumentNumber(exec: AccountingTx, prefix: DocPrefix, year: number): Promise<string> // "JE-2026-000001"

// src/services/accounting/journal-service.ts
JournalService.post(id: string, ctx: AuditContext): Promise<JournalEntry>                     // transactional 🔑
JournalService.reverse(id: string, reason: string, ctx: AuditContext): Promise<JournalEntry>  // transactional 🔑

// src/services/accounting/invoice-service.ts · payment-service.ts
InvoiceService.issue(id: string, ctx: AuditContext): Promise<{ invoice; journalEntry }>                                // 🔑
PaymentService.recordCustomerPayment(input: PaymentCreateInput, ctx: AuditContext): Promise<{ payment; allocations }>  // 🔑

// src/services/accounting/ledger-service.ts
LedgerService.trialBalance(asOf?: Date): Promise<ITrialBalance>
LedgerService.balanceSheet(asOf?: Date): Promise<IBalanceSheet>

// src/utils/accounting/accounting-error.ts
toAccountingErrorResponse(error: unknown): { success: false; error: string; code?: string; httpStatus: number }
```

Modified functions: none removed, none signature-changed anywhere in existing code. Additive only: `AdminSidebar` nav array (new "Financials" group) and `package.json` scripts (`db:accounting:generate` → drizzle-kit generate, `migrate:accounting`, `seed:accounting`).

## Classes

Static-method service classes (pattern matches `PageService`): `AccountService`, `PeriodService`, `NumberService`, `JournalService`, `LedgerService`, `CustomerService`, `VendorService`, `InvoiceService`, `PaymentService`, `BillService`, `IdempotencyService`. One error class: `AccountingError extends Error`. Persistence introduces **no classes** — Drizzle tables are exported plain objects from `src/db/schema/accounting/*`, typed via `$inferSelect`/`$inferInsert`. `src/models/index.ts` and Mongoose registration are not involved anywhere in this module.

## Dependencies

| Package | Kind | Version | Purpose |
|---|---|---|---|
| `drizzle-orm` | dependency | `^0.44` | Typed PG schema, query builder, `db.transaction()` — owner-picked ORM |
| `pg` | dependency | `^8` | node-postgres driver pooled behind the accounting DB client |
| `@types/pg` | devDependency | `^20` | Type definitions for `pg` |
| `drizzle-kit` | devDependency | `^0.31` | Migration generation + studio; driven by `drizzle.config.ts` |
| `decimal.js` | dependency | `^10.6.0` (**already installed**) | Half-up scale-2 arithmetic bridging `NUMERIC` string columns via `money.ts` |

```bash
npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
```

**Package.json scripts added (4)** — runners follow the existing `ts-node scripts/…` seed pattern:

| Script | Purpose |
|---|---|
| `db:accounting:generate` | `drizzle-kit generate` → SQL migrations emitted & committed to the repo |
| `migrate:accounting` | `ts-node scripts/migrate-accounting.ts` → programmatic `migrate()` from `drizzle-orm/node-postgres/migrator`, using `ACCOUNTING_DB_ADMIN_URL` |
| `studio:accounting` | Dev-time data browser (`drizzle-kit studio`) |
| `seed:accounting` | `ts-node scripts/seed-accounting.ts` — CoA + fiscal-year seed, idempotent |

**Environment variables:** `ACCOUNTING_DATABASE_URL` (runtime least-privilege DML role), `ACCOUNTING_DB_ADMIN_URL` (DDL for migrate/seed only), `ACCOUNTING_BASE_CURRENCY=USD`.

**Explicitly NOT added:** Prisma/Kysely/TypeORM (owner picked Drizzle), any new MongoDB package (content stack untouched), any accounting library, any new test tooling (Jest 30 + ts-jest + ts-node already configured).

## Testing

Three layers, mirroring the repo convention of mocking the data layer (`version-service.test.ts` mocks `dbConnect`; here we mock the Drizzle client):

1. **Pure units (no DB):** `src/__tests__/utils/accounting/money.test.ts` — parse/normalize strings, half-up rounding against spec examples (`"100.005"` → `"100.01"` class cases), summation precision, malformed-input rejection; plus `toAccountingErrorResponse` mapping tests (domain codes, unexpected-error fallback).
2. **Services with mocked Drizzle:** suites in `src/__tests__/services/accounting/`. Every transactional method receives the `exec: AccountingTx` handle as a parameter, so tests inject a stub handle and `jest.mock('@/db/accounting-client', …)` where needed — asserting JE shapes, status transitions, allocation math, thrown `AccountingErrorCode`s without a live server:
   - **`journal-service.test.ts`** — spec §31 matrix: balanced accepted; `Dr 100 / Cr 90` rejected `JOURNAL_UNBALANCED`; debit-only / credit-only / <2-line rejected; group or inactive account rejected `ACCOUNT_NOT_POSTABLE` / `ACCOUNT_INACTIVE`; CLOSED-period post rejected `PERIOD_CLOSED`; edit/delete of POSTED rejected `DOCUMENT_NOT_EDITABLE`; reverse creates the mirrored cross-referenced entry, original unchanged, ΣDr = ΣCr preserved.
   - **`invoice-payment.test.ts`** — issue emits `Dr 1200 total / Cr 4000 subtotal / Cr 2200 tax`; payment emits `Dr Cash / Cr 1200`; allocations enforce ≤ invoice balance (`PAYMENT_EXCEEDS_BALANCE`) and Σ ≤ amount (`PAYMENT_ALLOCATION_EXCEEDS_AMOUNT`); status flow `ISSUED → PARTIALLY_PAID → PAID`; spec §12.2 multi-invoice scenario.
   - **`bill-service.test.ts`** — approve→post emits `Dr expense lines (+tax 2200) / Cr 2100`; vendor payment emits `Dr 2100 / Cr Cash`.
   - **`ledger-service.test.ts`** — Trial Balance ΣDr = ΣCr; Balance Sheet Assets = Liabilities + Equity + NetProfit; DRAFT entries excluded everywhere.
   - **`idempotency-service.test.ts`** — replayed key returns the original outcome exactly once.
3. **Real-Postgres validation (manual trigger):** `docker compose -f docker-compose.umami.yml up -d umami-db` → `npm run migrate:accounting` → `npm run seed:accounting` → exercise flows via admin UI/curl. Required as a pre-commit gate from Part 2 onward; Part 7 additionally proves atomic rollback (forced mid-transaction failure leaves zero partial rows) and optimistic-lock rejection live.

Per-Part gates before each commit: `npx tsc --noEmit` · `npx eslint <touched files>` · `npm test` · `npm run build`.

## Implementation Order

Seven independently triggerable Parts; owner says "start Part N" and nothing beyond it is built. Each Part ends green (`npx tsc --noEmit` · `npx eslint <touched files>` · `npm test` · `npm run build`) and is committed separately before the next begins. Migrations accumulate (`0000_*.sql`, `0001_*.sql`, …) and are always generated with `npm run db:accounting:generate` then applied with `npm run migrate:accounting`.

**Part 1 — Infrastructure & Foundation**
1. Modify `docker-compose.umami.yml` (`umami-db`: host port `5432:5432`, `./docker/postgres-init:/docker-entrypoint-initdb.d:ro` mount, `pg_isready` healthcheck); write `docker/postgres-init/01-create-accounting-db.sql`; extend `.env.local` / `.env.example`.
2. Install packages: `npm i drizzle-orm pg` · `npm i -D drizzle-kit @types/pg` (`decimal.js@^10.6.0` already present).
3. Create `src/db/pg-client.ts` (pooled Drizzle singleton + `AccountingDB`/`AccountingTx` types + `closeAccountingPool()`) and `drizzle.config.ts`.
4. Create `src/types/accounting-types.ts`, `src/db/schema/accounting/enums.ts`, and the three foundation tables (`accounts.ts`, `accounting-periods.ts`, `document-counters.ts`) + `index.ts` barrel.
5. Create `src/utils/accounting/money.ts` (decimal.js wrappers) and the error-code → HTTP mapping utility (`toAccountingErrorResponse`).
6. Generate migration `0000_*.sql`; create `scripts/create-accounting-db.ts` (fallback for existing volumes), `scripts/migrate-accounting.ts`, `scripts/seed-accounting.ts` (spec §29 Chart of Accounts + current-year 12 OPEN periods, idempotent); wire the four `package.json` scripts.
7. Tests: `src/__tests__/utils/accounting/money.test.ts` + error-mapping test. Live gate: `docker compose -f docker-compose.umami.yml up -d umami-db` → create-db script → migrate → seed against real Postgres.
8. Append Part 1 status to `memory.md`; commit.

**Part 2 — Core Journal Engine:** add `journal-entries.ts`, `postings.ts`, `idempotency-records.ts` schemas (migration `0001`); `runInFinancialTransaction` helper; services `NumberService` (row-locked counter inside caller tx), `PeriodService`, `AccountService`, `IdempotencyService`, `JournalService` (DRAFT → PENDING_APPROVAL → APPROVED → POSTED 🔑 → REVERSED 🔑 with optimistic `version`); API routes for accounts, periods (+close/reopen), journal-entries (+submit/approve/post/reverse); Mongo `AuditService` best-effort outside the PG transaction; `src/__tests__/services/accounting/journal-service.test.ts`.

**Part 3 — Accounts Receivable:** schemas `customers.ts`, `invoices.ts` (embedded JSON lines), `payments.ts` (embedded allocations) → migration `0002`; `CustomerService`, `InvoiceService` (issue 🔑 / cancel), `PaymentService.recordCustomerPayment` 🔑 (allocation ≤ balance, Σ ≤ amount); routes `/api/accounting/customers`, spec §22 `/api/invoices/**`, `/api/payments`; `invoice-payment.test.ts`.

**Part 4 — Accounts Payable:** schemas `vendors.ts`, `vendor-bills.ts` → migration `0003`; `VendorService`, `BillService` (approve → post 🔑 → pay 🔑 mirroring AR); routes `/api/vendors/**`, `/api/bills/**`; `bill-service.test.ts`.

**Part 5 — Financial Reporting:** `LedgerService` — General Ledger (filters + pagination), Trial Balance, P&L, Balance Sheet, AR/AP aging — aggregating POSTED postings only; report GET routes under `/api/accounting/`; `ledger-service.test.ts` invariants.

**Part 6 — Admin UI:** every screen from the Admin UI section (dashboard, accounts, journal entries with state-machine actions, invoices + RecordPaymentModal, bills, customers, vendors, tabbed Reports, Periods close/reopen) plus `StatusBadge`/`MoneyDisplay` and the AdminSidebar "Financials" group.

**Part 7 — Hardening & Docs:** live verification — stale-version update rejected, idempotency-key replay returns original result once, forced mid-transaction failure leaves zero partial rows; `docs/accounting/ACCOUNTING-API.md`; spec §32 acceptance-criteria sweep; `memory.md` + `future-plan.md` status updates.

Cross-cutting rule for every Part: no floats for money (strings ↔ `numeric(18,2)` only), no mutation or hard-delete of POSTED records, `requireAdmin()` on every route, Zod validation before any service call, every multi-write flow inside `runInFinancialTransaction`.



