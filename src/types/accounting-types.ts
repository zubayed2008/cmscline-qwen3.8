/**
 * Accounting Engine - Domain Types (Phase 18)
 *
 * Single source of truth for every accounting domain union and payload
 * interface. The PostgreSQL enum tuples in `src/db/schema/accounting/enums.ts`
 * mirror these unions 1:1 via compile-time guards, so a change here that is
 * not mirrored in the schema fails the build.
 *
 * Money rule: ALL monetary amounts are strings at rest and on the wire.
 * Drizzle `numeric` columns return strings; arithmetic happens exclusively
 * inside `src/utils/money.ts` (decimal.js) or in SQL aggregates.
 */

// ---------------------------------------------------------------------------
// Domain unions (mirrored by pgEnums)
// ---------------------------------------------------------------------------

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export type NormalBalance = 'Debit' | 'Credit';

export type JournalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'POSTED' | 'REVERSED';

/** Invoice lifecycle per spec §7.1. */
export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'VOIDED';

/** Vendor bill lifecycle per spec §11.1. */
export type BillStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'POSTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export type PeriodStatus = 'OPEN' | 'CLOSED';

export type PartyStatus = 'ACTIVE' | 'INACTIVE';

export type PaymentType = 'CUSTOMER' | 'VENDOR';

/**
 * Origin of a journal entry / payment document.
 * OPENING_BALANCE journals seed account balances during period setup.
 */
export type AccountingSourceType =
  | 'MANUAL'
  | 'OPENING_BALANCE'
  | 'INVOICE'
  | 'CUSTOMER_PAYMENT'
  | 'VENDOR_BILL'
  | 'VENDOR_PAYMENT';

/** Spec §12.1 defines only a present status field; v1 ships COMPLETED. */
export type PaymentStatus = 'COMPLETED';

// ---------------------------------------------------------------------------
// Shared field shapes
// ---------------------------------------------------------------------------

/** ISO date string (yyyy-mm-dd) used for business dates. */
export type IsoDateString = string;

/** ISO 8601 timestamp string as returned by timestamptz columns. */
export type IsoTimestampString = string;

/** Monetary amount serialized as a fixed 2-decimal string, e.g. "1250.50". */
export type MoneyString = string;

export interface PartyBase {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: PartyStatus;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId: string | null;
  isActive: boolean;
  /** Denormalized snapshot of the creating Mongo user's display name. */
  createdByName: string | null;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export interface AccountingPeriod {
  id: string;
  name: string;
  fiscalYear: number;
  periodNumber: number;
  startDate: IsoDateString;
  endDate: IsoDateString;
  status: PeriodStatus;
  closedBy: string | null;
  closedAt: IsoTimestampString | null;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  lineNumber: number;
  accountId: string;
  debit: MoneyString;
  credit: MoneyString;
  description: string | null;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: IsoDateString;
  memo: string | null;
  status: JournalStatus;
  sourceType: AccountingSourceType;
  sourceId: string | null;
  reversalOfId: string | null;
  postedAt: IsoTimestampString | null;
  postedBy: string | null;
  createdBy: string | null;
  createdByName: string | null;
  lines: JournalEntryLine[];
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

// ---------------------------------------------------------------------------
// AR / AP payloads (service-layer contracts)
// ---------------------------------------------------------------------------

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  status?: PartyStatus;
}

export interface CreateVendorInput {
  name: string;
  email?: string;
  phone?: string;
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {
  status?: PartyStatus;
}

export interface InvoiceLineInput {
  accountId: string;
  description?: string;
  quantity: number;
  unitPrice: MoneyString;
}

export interface CreateInvoiceInput {
  customerId: string;
  invoiceNumber?: string;
  issueDate: IsoDateString;
  dueDate: IsoDateString;
  notes?: string;
  lines: InvoiceLineInput[];
}

export interface BillLineInput {
  accountId: string;
  description?: string;
  quantity: number;
  unitPrice: MoneyString;
}

export interface CreateBillInput {
  vendorId: string;
  billNumber?: string;
  billDate: IsoDateString;
  dueDate: IsoDateString;
  notes?: string;
  lines: BillLineInput[];
}

export interface RecordPaymentInput {
  paymentType: PaymentType;
  partyId: string;
  paymentDate: IsoDateString;
  amount: MoneyString;
  cashAccountId: string;
  reference?: string;
  /** Optional allocations; when omitted the service auto-allocates FIFO. */
  allocations?: PaymentAllocationInput[];
}

export interface PaymentAllocationInput {
  invoiceOrBillId: string;
  amount: MoneyString;
}

export interface CustomerStatementResponse {
  customer: PartyBase;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    issueDate: IsoDateString;
    dueDate: IsoDateString;
    total: MoneyString;
    amountPaid: MoneyString;
    balanceDue: MoneyString;
    status: InvoiceStatus;
  }>;
  totalBalanceDue: MoneyString;
}

export interface VendorStatementResponse {
  vendor: PartyBase;
  bills: Array<{
    id: string;
    billNumber: string;
    billDate: IsoDateString;
    dueDate: IsoDateString;
    total: MoneyString;
    amountPaid: MoneyString;
    balanceDue: MoneyString;
    status: BillStatus;
  }>;
  totalBalanceDue: MoneyString;
}

// ---------------------------------------------------------------------------
// Journal engine payloads (Part 2)
// ---------------------------------------------------------------------------

/** Who performs a financial action (built from the NextAuth session). */
export interface AccountingActor {
  userId?: string | null;
  userName?: string | null;
}

export interface JournalLineInput {
  accountId: string;
  /** Exactly one of debit/credit must be a positive amount; the other "0.00". */
  debit: MoneyString;
  credit: MoneyString;
  description?: string;
}

export interface CreateJournalEntryInput {
  entryDate: IsoDateString;
  memo?: string;
  sourceType?: AccountingSourceType;
  sourceId?: string;
  lines: JournalLineInput[];
}

export interface UpdateJournalEntryInput {
  entryDate?: IsoDateString;
  memo?: string;
  sourceId?: string;
  lines?: JournalLineInput[];
  /** Optimistic lock: must match the stored version. */
  expectedVersion: number;
}

export interface ReverseJournalEntryInput {
  reason: string;
  expectedVersion?: number;
}

export interface ListJournalEntriesFilter {
  status?: JournalStatus;
  sourceType?: AccountingSourceType;
  fromDate?: IsoDateString;
  toDate?: IsoDateString;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Chart-of-accounts tree node (flat rows nested by parentId). */
export interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
}

export interface IdempotencyRecord {
  key: string;
  endpoint: string;
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
  createdAt: IsoTimestampString;
  expiresAt: IsoTimestampString;
}

// ---------------------------------------------------------------------------
// Financial reporting payloads (Part 5)
// ---------------------------------------------------------------------------

/** One General Ledger posting line with its running account balance. */
export interface ILedgerRow {
  id: string;
  entryDate: IsoDateString;
  entryNumber: string;
  memo: string | null;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: MoneyString;
  credit: MoneyString;
  /** Running balance AFTER this posting (signed: debit positive). */
  balance: MoneyString;
}

export interface ITrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  /** Signed net (debit - credit). */
  balance: MoneyString;
  debit: MoneyString;
  credit: MoneyString;
}

export interface ITrialBalance {
  asOf: IsoDateString | null;
  rows: ITrialBalanceRow[];
  totalDebit: MoneyString;
  totalCredit: MoneyString;
  balanced: boolean;
}

export interface IProfitLossRow {
  accountId: string;
  code: string;
  name: string;
  /** Positive on the account's normal side (Revenue credited, Expense debited). */
  amount: MoneyString;
}

export interface IProfitLoss {
  from: IsoDateString;
  to: IsoDateString;
  revenues: IProfitLossRow[];
  expenses: IProfitLossRow[];
  totalRevenue: MoneyString;
  totalExpenses: MoneyString;
  netIncome: MoneyString;
}

export interface IBalanceSheetSection {
  title: 'Assets' | 'Liabilities' | 'Equity';
  rows: Array<{
    accountId: string;
    code: string;
    name: string;
    amount: MoneyString;
  }>;
  total: MoneyString;
}

export interface IBalanceSheet {
  asOf: IsoDateString;
  assets: IBalanceSheetSection;
  liabilities: IBalanceSheetSection;
  equity: IBalanceSheetSection;
  totalAssets: MoneyString;
  totalLiabilitiesEquity: MoneyString;
  /** Current-year earnings ploughed into Equity (kept separate for display). */
  netIncome: MoneyString;
  balanced: boolean;
  /** Non-null when Assets != Liabilities + Equity + NetIncome. */
  warning: string | null;
}

/** Aging buckets are driven by days past due (spec §15.3). */
export type AgingBucketKey = 'CURRENT' | '1-30' | '31-60' | '61-90' | '90+';

export interface IAgingBucket {
  bucket: AgingBucketKey;
  amount: MoneyString;
  documentCount: number;
}

export interface IAgingReport {
  asOf: IsoDateString;
  buckets: IAgingBucket[];
  total: MoneyString;
}

