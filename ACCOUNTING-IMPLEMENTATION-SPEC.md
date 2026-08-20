# Core Financial Accounting Engine — BRD Enhancement & Implementation Specification

> **Document purpose:** This document extends the original Business Requirements Document (BRD) for the Next.js CMS Core Financial Accounting Engine. It captures the missing accounting rules, domain behavior, data requirements, API expectations, controls, and acceptance criteria needed for reliable implementation by an AI coding agent or human development team.
>
> **Recommended use:** Treat the original BRD as the product-level requirement and this document as the implementation contract. The implementation must not invent accounting behavior that is not specified here.

---

## 1. Original Scope

The module introduces a lightweight, double-entry financial accounting engine into the Next.js CMS.

The system must support:

- Chart of Accounts
- Double-entry journal accounting
- Accounts Receivable (AR)
- Accounts Payable (AP)
- Customer invoices
- Vendor bills
- Payments
- General Ledger
- Trial Balance
- Basic financial reporting
- Audit trail
- Immutable posted ledger
- Single base currency for v1

The system is **not intended to be a full ERP**.

---

# 2. Accounting Principles

## 2.1 Double-Entry Rule

Every posted journal entry must satisfy:

```text
Total Debits = Total Credits
```

A journal entry must contain:

- At least one debit posting
- At least one credit posting
- At least two postings total
- Positive monetary amounts only
- A valid posting account for every line

If the implementation internally represents credits as negative signed values, the signed total may equal zero. The business rule remains:

```text
Debit Total == Credit Total
```

## 2.2 Normal Account Balances

| Account Type | Normal Balance | Debit Effect | Credit Effect |
|---|---|---|---|
| Asset | Debit | Increase | Decrease |
| Liability | Credit | Decrease | Increase |
| Equity | Credit | Decrease | Increase |
| Revenue | Credit | Decrease | Increase |
| Expense | Debit | Increase | Decrease |

The application must use these rules consistently when calculating balances and reports.

## 2.3 Source of Truth

The **Postings ledger is the authoritative accounting source of truth**.

Derived reports and balances must ultimately be based on posted postings.

Examples:

- General Ledger → postings
- Trial Balance → postings
- Profit & Loss → postings
- Balance Sheet → postings
- AR balance → relevant posted AR transactions
- AP balance → relevant posted AP transactions

Cached account balances may be added later for performance, but they must not become the authoritative record.

---

# 3. Monetary and Currency Rules

## 3.1 Currency

For v1:

- One base currency only
- No foreign-currency transactions
- Every financial document uses the base currency
- Currency must be explicitly stored on financial documents where practical

## 3.2 Data Type

All monetary calculations and persisted monetary amounts must use a high-precision Decimal type such as MongoDB `Decimal128`.

Floating-point `Double` values must not be used for financial amounts.

## 3.3 Precision and Rounding

Define one application-wide monetary policy:

- Monetary precision: 2 decimal places unless a future requirement explicitly changes it
- Rounding: half-up
- No binary floating-point arithmetic for financial calculations
- Tax, invoice, payment, and reporting calculations must use the same rounding policy

The policy must be centralized rather than duplicated across UI and API code.

---

# 4. Chart of Accounts

## 4.1 Required Account Types

- Asset
- Liability
- Equity
- Revenue
- Expense

## 4.2 Recommended Account Model

```text
Account
- id
- code
- name
- accountType
- parentAccountId
- level
- normalBalance
- isGroup
- isPostable
- isActive
- description
- createdAt
- updatedAt
- createdBy
- updatedBy
```

## 4.3 Account Rules

- `code` must be unique
- `name` must be present
- `accountType` must be one of the supported types
- `normalBalance` is derived from the account type and should not contradict it
- Group accounts may contain child accounts
- Only `isPostable = true` accounts may receive journal postings
- An account referenced by posted postings must not be hard-deleted
- Accounts may be deactivated instead of deleted
- A deactivated account cannot receive new postings

## 4.4 Example Hierarchy

```text
1000 Assets
  1100 Cash
  1200 Accounts Receivable
  1300 Bank

2000 Liabilities
  2100 Accounts Payable
  2200 Tax Payable

3000 Equity
  3100 Owner Equity

4000 Revenue
  4100 Sales Revenue

5000 Expenses
  5100 Office Expense
  5200 Utilities Expense
```

The parent/group accounts should normally be non-postable.

---

# 5. Journal Entry Domain

## 5.1 Recommended Journal Entry Model

```text
JournalEntry
- id
- journalNumber
- entryDate
- postingDate
- accountingPeriodId
- description
- reference
- sourceType
- sourceId
- status
- totalDebit
- totalCredit
- createdBy
- approvedBy
- postedBy
- reversedBy
- createdAt
- approvedAt
- postedAt
- reversedAt
- reversalOfEntryId
- reversalReason
```

## 5.2 Journal Entry Lifecycle

Recommended state machine:

```text
DRAFT
  ↓
PENDING_APPROVAL
  ↓
APPROVED
  ↓
POSTED
  ↓
REVERSED
```

Not every implementation needs a separate `APPROVED` state, but the state behavior must be explicit.

### DRAFT

- Can be edited
- Does not affect financial balances
- Is not included in official financial reports

### PENDING_APPROVAL

- Awaiting approval
- Normal users must not change financial content unless explicitly permitted

### APPROVED

- Approved for posting
- Awaiting final posting operation

### POSTED

- Financially effective
- Immutable
- Included in the General Ledger and reports
- Cannot be deleted
- Cannot be edited

### REVERSED

- The original posted entry remains unchanged
- A separate reversing entry is created
- The reversal must reference the original entry

---

# 6. Posting Model

## 6.1 Recommended Posting Model

```text
Posting
- id
- journalEntryId
- accountId
- debitAmount
- creditAmount
- description
- customerId
- vendorId
- createdAt
```

An implementation may use one signed amount instead, but the business behavior must remain equivalent.

## 6.2 Posting Rules

Each posting must:

- Belong to exactly one journal entry
- Reference one valid account
- Reference a postable account
- Have a positive debit OR positive credit amount, never both
- Never have both debit and credit values populated
- Never have both values zero
- Use Decimal128
- Be immutable once the journal entry is posted

## 6.3 Journal Validation

Before a journal entry becomes POSTED:

```text
postingCount >= 2
debitPostingCount >= 1
creditPostingCount >= 1
sum(debitAmount) == sum(creditAmount)
all accounts exist
all accounts are postable
all amounts > 0
accounting period is open
```

---

# 7. Immutability and Corrections

## 7.1 Immutability

Once a journal entry is posted:

- The journal entry cannot be edited
- Its postings cannot be edited
- Its postings cannot be deleted
- The financial amounts cannot be changed

## 7.2 Corrections

Corrections must use a reversing or contra journal entry.

Example:

Original:

```text
Dr Office Expense        100
    Cr Cash                  100
```

Correction:

```text
Dr Cash                  100
    Cr Office Expense        100
```

Then a new correct entry may be posted if necessary.

The original entry remains permanently visible.

---

# 8. Atomic Transactions

Financial state changes must be atomic.

Any operation that changes both a business document and its accounting records must execute inside one database transaction.

Example:

```text
Issue Invoice
    ├── update invoice status
    ├── create journal entry
    └── create postings
```

All operations succeed together or all roll back.

Example:

```text
Record Payment
    ├── create payment
    ├── create allocation(s)
    ├── create journal entry
    └── create postings
```

Again, all succeed or all roll back.

For MongoDB, use a session-based multi-document transaction where the deployment supports transactions.

---

# 9. Fiscal Periods

Fiscal periods must be modeled explicitly.

## 9.1 Recommended Model

```text
AccountingPeriod
- id
- name
- fiscalYear
- periodNumber
- startDate
- endDate
- status
- closedBy
- closedAt
```

## 9.2 Status

```text
OPEN
CLOSED
```

## 9.3 Rules

- New postings may only be posted into an OPEN period
- CLOSED periods reject new postings
- Posted entries in a CLOSED period cannot be edited
- Reopening a period requires a privileged permission
- Period closing must be audited

---

# 10. Document Numbering

Financial documents must have unique identifiers.

Recommended formats:

```text
JE-2026-000001
INV-2026-000001
PAY-2026-000001
BILL-2026-000001
```

Rules:

- Numbers must be unique
- Numbers must never be reused
- Posted document numbers are immutable
- Number generation must be concurrency-safe
- Annual reset is optional, but the policy must be explicit

---

# 11. Accounts Receivable

## 11.1 Customer Model

```text
Customer
- id
- customerCode
- name
- email
- phone
- address
- taxId
- status
- createdAt
- updatedAt
```

A customer may reference a shared AR control account or a dedicated subledger configuration depending on implementation. For a lightweight v1, a shared `Accounts Receivable` control account is recommended.

## 11.2 Invoice Model

```text
Invoice
- id
- invoiceNumber
- customerId
- invoiceDate
- dueDate
- currency
- subtotal
- taxAmount
- totalAmount
- amountPaid
- balanceDue
- status
- journalEntryId
- notes
- createdBy
- createdAt
- updatedAt
```

## 11.3 Invoice Line

```text
InvoiceLine
- id
- invoiceId
- description
- quantity
- unitPrice
- taxRate
- taxAmount
- revenueAccountId
- lineTotal
```

## 11.4 Invoice Lifecycle

Recommended:

```text
DRAFT
  ↓
ISSUED
  ↓
PARTIALLY_PAID
  ↓
PAID
```

Additional terminal/error states may include:

```text
OVERDUE
CANCELLED
VOIDED
```

The exact transition rules must be enforced server-side.

## 11.5 Invoice Accounting

For an accrual-based invoice where revenue is recognized at issue:

```text
Dr Accounts Receivable
    Cr Revenue
```

The invoice must not be considered financially effective until its accounting entry is successfully posted.

---

# 12. Customer Payments

## 12.1 Payment Model

```text
Payment
- id
- paymentNumber
- paymentType
- customerId
- paymentDate
- amount
- cashAccountId
- reference
- status
- journalEntryId
- createdBy
- createdAt
```

## 12.2 Payment Allocation

```text
PaymentAllocation
- id
- paymentId
- invoiceId
- allocatedAmount
```

A single payment may be allocated across multiple invoices.

Example:

```text
INV-001 = 1,000
INV-002 = 2,000
Payment = 2,500

Allocation:
INV-001 → 1,000
INV-002 → 1,500
```

## 12.3 Payment Accounting

```text
Dr Cash/Bank
    Cr Accounts Receivable
```

The implementation must prevent allocating more than the payment amount or the invoice's outstanding balance.

---

# 13. Accounts Payable

## 13.1 Vendor Model

```text
Vendor
- id
- vendorCode
- name
- email
- phone
- address
- taxId
- status
- createdAt
- updatedAt
```

## 13.2 Vendor Bill Model

```text
VendorBill
- id
- billNumber
- vendorId
- billDate
- dueDate
- subtotal
- taxAmount
- totalAmount
- amountPaid
- balanceDue
- status
- journalEntryId
- notes
- createdBy
- createdAt
- updatedAt
```

## 13.3 Vendor Bill Lifecycle

```text
DRAFT
  ↓
APPROVED
  ↓
POSTED
  ↓
PARTIALLY_PAID
  ↓
PAID
```

Cancellation rules must preserve the financial history of already-posted bills.

## 13.4 Vendor Bill Accounting

For a typical expense:

```text
Dr Expense
    Cr Accounts Payable
```

## 13.5 Vendor Payment Accounting

```text
Dr Accounts Payable
    Cr Cash/Bank
```

---

# 14. Tax Handling

The product team must explicitly decide whether tax support is in v1.

If tax is supported, define:

- Tax rates
- Tax-inclusive vs tax-exclusive pricing
- Tax account
- Tax amount storage
- Tax rounding rules
- Tax reporting behavior
- Tax treatment for credit notes/refunds

If tax is not supported in v1, state:

> Tax functionality beyond simple stored tax metadata is out of scope for v1.

---

# 15. Opening Balances

The system must provide a controlled way to initialize existing financial balances.

An opening balance is itself a balanced journal entry.

Example:

```text
Dr Cash                    100,000
Dr Accounts Receivable      20,000
Dr Equipment                50,000
    Cr Accounts Payable         30,000
    Cr Owner Equity            140,000
```

Rules:

- Opening balance entry must balance
- Opening balance must be auditable
- Opening balance must reference the initial accounting period
- Once posted, it is immutable

---

# 16. General Ledger

The General Ledger must display posted financial activity.

Recommended columns:

```text
Date
Journal Number
Description
Reference
Account
Debit
Credit
Running Balance
Source Type
Source ID
Created/Posted By
```

## 16.1 Filters

Support filtering by:

- Date range
- Account
- Journal number
- Reference
- Customer
- Vendor
- Source type
- Period
- Posting status

The ledger must exclude unposted drafts from official accounting totals.

---

# 17. Financial Reports

## 17.1 Trial Balance

Must show at least:

```text
Account
Debit
Credit
```

Core invariant:

```text
Total Trial Balance Debits == Total Trial Balance Credits
```

## 17.2 Profit & Loss

At minimum:

```text
Revenue
Expenses
Net Profit / Loss
```

## 17.3 Balance Sheet

At minimum:

```text
Assets
Liabilities
Equity
```

The accounting equation must hold:

```text
Assets = Liabilities + Equity
```

## 17.4 AR Aging

Recommended buckets:

```text
Current
1–30 days
31–60 days
61–90 days
90+ days
```

## 17.5 AP Aging

Use the same or an explicitly defined aging policy.

---

# 18. Audit Trail

Ledger immutability is not a complete audit system.

Create a separate audit log.

## 18.1 Recommended Audit Log

```text
AuditLog
- id
- userId
- action
- entityType
- entityId
- before
- after
- reason
- timestamp
- ipAddress
- userAgent
```

## 18.2 Auditable Actions

At minimum:

```text
CREATE
UPDATE
APPROVE
POST
REVERSE
VOID
CANCEL
CLOSE_PERIOD
REOPEN_PERIOD
```

Audit entries must themselves not be casually editable or deletable.

---

# 19. Source Linkage

Every accounting event should be traceable to its originating business object.

Recommended fields:

```text
sourceType
sourceId
```

Examples:

```text
sourceType = INVOICE
sourceId = invoice123
```

```text
sourceType = CUSTOMER_PAYMENT
sourceId = payment456
```

This should enable a navigation path such as:

```text
Invoice
  ↓
Journal Entry
  ↓
Postings
  ↓
Account Ledger
```

The same concept should work for vendor bills and payments.

---

# 20. Terminology

The implementation must distinguish these concepts:

### Business Transaction

The real-world event.

Example:

> Customer pays Invoice INV-102.

### Journal Entry

The accounting record for the event.

```text
JE-000102
Customer payment for INV-102
```

### Postings

The debit/credit lines:

```text
Cash                  Dr 1,000
Accounts Receivable   Cr 1,000
```

Invoices, payments, vendor bills, and journal entries are not interchangeable objects.

---

# 21. Authorization and Permissions

Although v1 may expose only the `Admin` role, the backend should use granular permissions so the design can expand later.

Recommended permissions:

```text
ACCOUNTING_VIEW
ACCOUNTING_CREATE
ACCOUNTING_APPROVE
ACCOUNTING_POST
ACCOUNTING_REVERSE
ACCOUNTING_MANAGE_ACCOUNTS
ACCOUNTING_CLOSE_PERIOD
AR_MANAGE
AP_MANAGE
REPORT_VIEW
AUDIT_VIEW
```

Authorization must be enforced server-side.

Do not rely on UI visibility as the security mechanism.

NextAuth session validation must be performed on protected API routes/server actions.

---

# 22. API Requirements

Exact paths may vary, but the implementation should provide equivalent capabilities.

## 22.1 Accounts

```text
GET    /api/accounting/accounts
POST   /api/accounting/accounts
PATCH  /api/accounting/accounts/:id
```

## 22.2 Journal Entries

```text
GET    /api/accounting/journal-entries
POST   /api/accounting/journal-entries
POST   /api/accounting/journal-entries/:id/approve
POST   /api/accounting/journal-entries/:id/post
POST   /api/accounting/journal-entries/:id/reverse
```

## 22.3 Ledger and Reports

```text
GET /api/accounting/ledger
GET /api/accounting/trial-balance
GET /api/accounting/profit-loss
GET /api/accounting/balance-sheet
GET /api/accounting/ar-aging
GET /api/accounting/ap-aging
```

## 22.4 Invoices

```text
GET  /api/invoices
POST /api/invoices
POST /api/invoices/:id/issue
POST /api/invoices/:id/cancel
```

## 22.5 Payments

```text
GET  /api/payments
POST /api/payments
```

## 22.6 Vendors and Bills

```text
GET  /api/vendors
POST /api/vendors

GET  /api/bills
POST /api/bills
POST /api/bills/:id/approve
POST /api/bills/:id/cancel
```

The final implementation should define request schemas, response schemas, status codes, and validation errors for each endpoint.

---

# 23. API Validation

Server-side validation must enforce:

- Authentication
- Authorization
- Input schema validation
- Decimal parsing/validation
- Account validity
- Journal balancing
- Period status
- Document status
- Ownership/relationship rules
- Duplicate detection
- Allocation limits
- Immutable posted records

Client-side validation is helpful but must never be treated as the security or integrity boundary.

---

# 24. Idempotency

Financial mutation APIs must be safe against accidental duplicate requests.

Use an idempotency key or equivalent duplicate-request protection for operations such as:

- Posting an invoice
- Recording a payment
- Posting a journal entry
- Reversing an entry

Example:

```text
POST /api/payments

Idempotency-Key: PAY-REQUEST-ABC123
```

Repeated submissions with the same key must not create duplicate financial transactions.

---

# 25. Concurrency Control

Financial records must be protected against concurrent modification.

Recommended approach:

- Immutable posted records
- Optimistic locking/versioning for editable documents
- Transactional writes for financial state
- Safe/atomic document numbering
- Server-side duplicate detection

Example:

```text
version = 7
```

A stale update against version 7 after another process has already changed the document to version 8 must be rejected.

---

# 26. Error Handling

Financial operations should fail clearly and transactionally.

Examples:

```text
JOURNAL_UNBALANCED
ACCOUNT_NOT_POSTABLE
ACCOUNT_INACTIVE
PERIOD_CLOSED
ENTRY_ALREADY_POSTED
ENTRY_ALREADY_REVERSED
DOCUMENT_NOT_EDITABLE
PAYMENT_EXCEEDS_BALANCE
PAYMENT_ALLOCATION_EXCEEDS_AMOUNT
DUPLICATE_IDEMPOTENCY_KEY
UNAUTHORIZED
FORBIDDEN
```

Responses should provide machine-readable error codes plus safe human-readable messages.

No financial operation should leave behind partial data when a transaction fails.

---

# 27. Deletion and Retention Rules

## Master Data

For accounts, customers, and vendors:

- Prefer soft deletion/deactivation
- Do not hard-delete records required by historical postings

## Draft Documents

Drafts may be deleted only if explicitly allowed by the workflow.

## Posted Financial Documents

Never hard-delete.

Posted documents must be reversed, cancelled through an accounting action, or otherwise corrected using an auditable accounting transaction.

---

# 28. Database Invariants

The database design should support the following invariants:

## Journal Entry

```text
- Must have at least 2 postings
- Must contain debit(s) and credit(s)
- Sum(debits) == Sum(credits)
- All postings reference existing accounts
- All posting accounts are postable
- Amounts are positive Decimal values
- Journal entry belongs to a valid period
- Posted entry cannot be mutated
```

## Posting

```text
- Exactly one journalEntryId
- Exactly one accountId
- Debit OR Credit, not both
- Amount > 0
- Decimal monetary type
```

## Account

```text
- Unique code
- Valid account type
- Valid parent relationship
- Cannot receive postings if non-postable
- Cannot be deleted if referenced by posted postings
```

Database-level uniqueness and application-level validation should both be used where appropriate.

---

# 29. Seed Data

Phase 1 must include deterministic seed data.

Example:

```text
1000 Assets
1100 Cash
1200 Accounts Receivable
1300 Bank

2000 Liabilities
2100 Accounts Payable
2200 Tax Payable

3000 Equity
3100 Owner Equity

4000 Revenue
4100 Sales Revenue

5000 Expenses
5100 Office Expense
5200 Utilities Expense
```

The exact production Chart of Accounts may be changed later, but the initial seed set must be versioned and reproducible.

---

# 30. Example Accounting Scenarios

## 30.1 Cash Sale

Customer immediately pays for a service worth 1,000.

```text
Dr Cash                  1,000
    Cr Revenue                1,000
```

## 30.2 Credit Invoice

Invoice is issued for 1,000.

```text
Dr Accounts Receivable   1,000
    Cr Revenue                1,000
```

## 30.3 Customer Payment

Customer pays 1,000.

```text
Dr Cash                  1,000
    Cr Accounts Receivable   1,000
```

## 30.4 Vendor Bill

Vendor bill for office supplies of 500.

```text
Dr Office Expense          500
    Cr Accounts Payable        500
```

## 30.5 Vendor Payment

Pay the vendor 500.

```text
Dr Accounts Payable        500
    Cr Cash                    500
```

## 30.6 Expense Paid Immediately

Expense of 200 paid immediately.

```text
Dr Utilities Expense       200
    Cr Cash                    200
```

## 30.7 Reversal

Original:

```text
Dr Office Expense          100
    Cr Cash                    100
```

Reversal:

```text
Dr Cash                    100
    Cr Office Expense          100
```

---

# 31. Test Requirements

The development agent must produce automated tests for accounting behavior.

## Core Tests

### Balanced Journal

```text
Dr Cash 100
Cr Revenue 100
```

Expected: accepted.

### Unbalanced Journal

```text
Dr Cash 100
Cr Revenue 90
```

Expected: rejected.

### Missing Credit

```text
Dr Cash 100
```

Expected: rejected.

### Missing Debit

```text
Cr Revenue 100
```

Expected: rejected.

### Non-Postable Account

Expected: rejected.

### Inactive Account

Expected: rejected.

### Closed Period

Expected: rejected.

### Modify Posted Entry

Expected: rejected.

### Delete Posted Posting

Expected: rejected.

### Reverse Posted Entry

Expected:

- Original unchanged
- Reversal created
- Ledger remains balanced

### Atomic Failure

Force one posting write to fail.

Expected:

- Journal entry not persisted
- No partial postings
- No partially-updated business document

### Duplicate Request

Repeat a financial mutation with the same idempotency key.

Expected:

- One financial result only

### Payment Allocation

Attempt allocation greater than invoice balance.

Expected: rejected.

### Trial Balance

Expected:

```text
Total Debits == Total Credits
```

### Balance Sheet

Expected:

```text
Assets == Liabilities + Equity
```

---

# 32. Acceptance Criteria

The module is ready for production consideration only when all of the following are true:

- [ ] Every posted journal entry balances
- [ ] Posted ledger entries are immutable
- [ ] Reversals preserve the original transaction
- [ ] Financial writes are atomic
- [ ] Decimal monetary storage is used
- [ ] No financial API depends on client-side validation for integrity
- [ ] Closed periods reject new postings
- [ ] Account rules are enforced
- [ ] Invoice posting creates correct accounting entries
- [ ] Customer payments create correct accounting entries
- [ ] Vendor bills create correct accounting entries
- [ ] Vendor payments create correct accounting entries
- [ ] Payment allocations cannot exceed outstanding balances
- [ ] General Ledger reflects posted entries correctly
- [ ] Trial Balance balances
- [ ] Balance Sheet equation holds
- [ ] Audit events are recorded
- [ ] Duplicate financial requests are prevented
- [ ] Concurrency conflicts are handled
- [ ] Automated accounting invariant tests pass
- [ ] Authorization is enforced server-side

---

# 33. Implementation Roadmap

## Phase 0 — Accounting Rules and Domain Specification

Define and lock:

- Accounting principles
- Account types
- Normal balances
- Journal lifecycle
- Posting rules
- Fiscal periods
- Rounding
- Document numbering
- Reversal rules
- Out-of-scope features

## Phase 1 — Core Ledger

Implement:

- Accounts
- Journal entries
- Postings
- Transaction engine
- Ledger
- Audit log
- Periods
- Opening balances
- Seed data

## Phase 2 — Accounts Receivable

Implement:

- Customers
- Invoices
- Invoice lines
- Customer payments
- Payment allocations
- AR aging

## Phase 3 — Accounts Payable

Implement:

- Vendors
- Vendor bills
- Vendor payments
- AP aging

## Phase 4 — Financial Reporting

Implement:

- General Ledger
- Trial Balance
- Profit & Loss
- Balance Sheet
- AR aging
- AP aging

## Phase 5 — Admin Controls

Implement:

- Approval workflow
- Period closing
- Period reopening
- Audit viewer
- Granular permissions
- Administrative accounting UI

## Phase 6 — Hardening

Implement and verify:

- Concurrency controls
- Idempotency
- Automated accounting invariant tests
- Integration tests
- Performance tests
- Failure/rollback testing

---

# 34. Explicit Out-of-Scope Features for v1

Unless separately approved, the following are out of scope:

```text
Multi-currency accounting
Bank reconciliation
Payroll
Inventory accounting
Fixed asset depreciation
Purchase orders
Sales orders
Budgeting
Recurring journals
Consolidated accounting
Inter-company accounting
Advanced tax compliance
Complex revenue recognition
Manufacturing accounting
```

This prevents an implementation agent from expanding scope without approval.

---

# 35. Recommended Agent Instructions

The coding agent should be given these rules:

1. **Do not invent accounting behavior.**
   Follow this specification for financial behavior.

2. **Do not weaken accounting invariants to make a feature easier.**
   Any conflict must be surfaced as an implementation blocker or explicit design decision.

3. **Never use JavaScript floating-point arithmetic for stored financial amounts.**

4. **Never mutate posted ledger records.**

5. **Never hard-delete posted accounting records.**

6. **All financial state changes must be transactional.**

7. **All financial API endpoints must validate authentication and authorization server-side.**

8. **All financial mutations must be idempotent or otherwise duplicate-safe where specified.**

9. **Every new accounting feature must include automated tests for balancing, atomicity, immutability, and relevant workflow rules.**

10. **When a requirement is unspecified, document the ambiguity rather than silently inventing accounting behavior.**

---

# 36. Key Design Decision Summary

Before implementation begins, the product owner should explicitly approve these decisions:

| Decision | Required |
|---|---|
| Accounting basis (accrual/cash) | Yes |
| Base currency | Yes |
| Decimal precision | Yes |
| Rounding method | Yes |
| Tax scope | Yes |
| Fiscal year definition | Yes |
| Period closing rules | Yes |
| Approval workflow | Yes |
| Journal numbering | Yes |
| Invoice numbering | Yes |
| Payment numbering | Yes |
| Reversal policy | Yes |
| Account hierarchy rules | Yes |
| Customer/vendor accounting model | Yes |
| Opening balance process | Yes |
| Retention/deletion policy | Yes |
| Permission model | Yes |
| v1 out-of-scope list | Yes |

---

# 37. Final Recommendation

The original BRD should remain the high-level business document.

This specification should be maintained alongside it as the **Accounting Engine Implementation Contract**.

Recommended document structure:

```text
/docs/accounting/
    BRD.md
    ACCOUNTING-IMPLEMENTATION-SPEC.md
    ACCOUNTING-API.md
    ACCOUNTING-TEST-CASES.md
```

This separation gives the development agent a clear source for:

- Business intent → `BRD.md`
- Accounting/domain rules → `ACCOUNTING-IMPLEMENTATION-SPEC.md`
- API contract → `ACCOUNTING-API.md`
- Automated acceptance scenarios → `ACCOUNTING-TEST-CASES.md`
