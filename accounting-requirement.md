# Business Requirements Document (BRD)
## Module: Core Financial Accounting Engine (Double-Entry)

### 1. Executive Summary & Scope
The objective of this module is to introduce a foundational, double-entry financial accounting system into the Next.js CMS. This lightweight financial engine allows administrators to track revenue, manage basic expenses, and maintain a secure audit trail of all financial movements without the bloat of a full-scale Enterprise Resource Planning (ERP) system. All transactions will be recorded in a single base currency.

### 2. Core Functional Requirements
*   **Chart of Accounts (CoA):** The system must maintain a hierarchical structure of accounts categorized by standard financial classifications (Assets, Liabilities, Equity, Revenue, and Expenses).
*   **Double-Entry Journal System:** Every financial event must be recorded as a transfer between at least two accounts. The total sum of all debits and credits in a single journal entry must inherently equal zero.
*   **Accounts Receivable (Invoicing):** The module must allow administrators to generate invoices. This transitions value from a Revenue account to an Accounts Receivable (Asset) account upon creation, and subsequently to a Cash account upon payment receipt. 
*   **Accounts Payable (Expenses):** The system must track money owed to external vendors, managing the lifecycle from invoice receipt to scheduled payment.

### 3. Architectural & Data Requirements
To prevent data corruption and ensure mathematical certainty, the database architecture must strictly enforce the following rules:
*   **Strict Immutability:** Financial ledger entries (Postings) cannot be deleted or modified once saved. Any corrections must be handled by creating a new, opposing "contra" or reversing entry to maintain a secure audit trail.
*   **Atomic Transactions:** When writing a journal entry with multiple associated postings, the database must execute the save operation atomically. If one posting fails, the entire transaction must roll back to prevent unbalanced ledgers.
*   **Data Types:** All monetary values must be stored using high-precision Decimal types (e.g., `Decimal128`). Standard floating-point numbers (Doubles) are strictly prohibited to avoid rounding errors.
*   **Relational Schema Mapping:** The schema will utilize distinct collections/tables for:
    *   `Accounts` (The Chart of Accounts definition)
    *   `JournalEntries` (The business event, e.g., "Invoice #102 Paid")
    *   `Postings` (The individual debit and credit line items linked to the Journal Entry)

### 4. Security & Compliance
*   **Role-Based Isolation:** Access to view the General Ledger, modify the Chart of Accounts, or approve journal entries must be strictly limited to the 'Admin' role via NextAuth session verification.
*   **Data Integrity Validations:** API route handlers and database schemas must use strict validation to ensure no transaction is accepted unless `Sum(Debits) == Sum(Credits)`.

### 5. Implementation Roadmap
*   **Phase 1:** Define the Chart of Accounts data models and seed the initial standard accounts.
*   **Phase 2:** Implement the Journal Entry and Posting data models with strict mathematical validation.
*   **Phase 3:** Build the backend API routes leveraging multi-document database transactions to ensure atomicity.
*   **Phase 4:** Build the Admin UI to view the General Ledger and manually input basic expenses.