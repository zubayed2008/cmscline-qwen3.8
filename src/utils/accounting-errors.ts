/**
 * Accounting error taxonomy + PostgreSQL error-code mapping.
 *
 * Services throw these typed errors; API routes translate them to the
 * standardized `{ success: false, error, code }` envelope via `toHttpStatus`.
 * Raw database exceptions never reach clients.
 */

/** PostgreSQL SQLSTATE codes the accounting engine cares about. */
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  INVALID_TEXT_REPRESENTATION: '22P02',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
} as const;

interface PgErrorShape {
  code?: string;
  constraint?: string;
  detail?: string;
  table?: string;
}

export class AccountingError extends Error {
  /** Stable machine-readable code used in API responses. */
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly cause?: unknown;

  constructor(message: string, code: string, httpStatus = 500, cause?: unknown) {
    super(message);
    this.name = 'AccountingError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.cause = cause;
  }
}

export class AccountingConflictError extends AccountingError {
  constructor(message: string, cause?: unknown) {
    super(message, 'ACCOUNTING_CONFLICT', 409, cause);
    this.name = 'AccountingConflictError';
  }
}

export class AccountingValidationError extends AccountingError {
  constructor(message: string, cause?: unknown) {
    super(message, 'ACCOUNTING_VALIDATION_FAILED', 400, cause);
    this.name = 'AccountingValidationError';
  }
}

export class AccountingNotFoundError extends AccountingError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'ACCOUNTING_NOT_FOUND', 404);
    this.name = 'AccountingNotFoundError';
  }
}

export class PeriodClosedError extends AccountingError {
  constructor(date: string, periodName?: string) {
    super(
      `Cannot post to ${date}${periodName ? ` - period "${periodName}" is closed` : ' - period is closed'}`,
      'PERIOD_CLOSED',
      409
    );
    this.name = 'PeriodClosedError';
  }
}

export class UnbalancedEntryError extends AccountingError {
  constructor(entryNumber: string) {
    super(
      `Journal entry ${entryNumber} is unbalanced: debits must equal credits`,
      'UNBALANCED_ENTRY',
      422
    );
    this.name = 'UnbalancedEntryError';
  }
}

// ---------------------------------------------------------------------------
// Document lifecycle errors (Parts 2+)
// ---------------------------------------------------------------------------

/** Mutation attempted on an immutable document (e.g. editing a POSTED entry). */
export class DocumentNotEditableError extends AccountingError {
  constructor(document: string, status: string) {
    super(
      `${document} cannot be modified in status ${status}`,
      'DOCUMENT_NOT_EDITABLE',
      409
    );
    this.name = 'DocumentNotEditableError';
  }
}

/** Lifecycle transition that the state machine does not allow. */
export class InvalidStateTransitionError extends AccountingError {
  constructor(document: string, from: string, to: string) {
    super(
      `${document}: transition ${from} -> ${to} is not allowed`,
      'DOCUMENT_INVALID_STATE',
      409
    );
    this.name = 'InvalidStateTransitionError';
  }
}

/** Optimistic-lock rejection: the document changed underneath the caller. */
export class ConcurrentModificationError extends AccountingError {
  constructor(document: string) {
    super(
      `${document} was modified by someone else - reload and retry`,
      'CONCURRENT_MODIFICATION',
      409
    );
    this.name = 'ConcurrentModificationError';
  }
}

/** Posting targeted a group/header account that must never receive amounts. */
export class AccountNotPostableError extends AccountingError {
  constructor(accountCode: string) {
    super(
      `Account ${accountCode} is a group account and cannot be posted to`,
      'ACCOUNT_NOT_POSTABLE',
      409
    );
    this.name = 'AccountNotPostableError';
  }
}

/** Posting/deactivation targeted a deactivated account. */
export class AccountInactiveError extends AccountingError {
  constructor(accountCode: string) {
    super(`Account ${accountCode} is inactive`, 'ACCOUNT_INACTIVE', 409);
    this.name = 'AccountInactiveError';
  }
}

/** Same idempotency key replayed with a DIFFERENT request payload. */
export class DuplicateIdempotencyKeyError extends AccountingError {
  constructor(key: string) {
    super(
      `Idempotency key "${key}" was already used with a different request`,
      'DUPLICATE_IDEMPOTENCY_KEY',
      409
    );
    this.name = 'DuplicateIdempotencyKeyError';
  }
}

/** Account type change forbidden once postings reference the account. */
export class AccountHasPostingsError extends AccountingError {
  constructor(accountCode: string) {
    super(
      `Account ${accountCode} already has postings and its type cannot change`,
      'ACCOUNT_HAS_POSTINGS',
      409
    );
    this.name = 'AccountHasPostingsError';
  }
}

function isPgError(value: unknown): value is PgErrorShape & Error {
  return (
    value instanceof Error &&
    typeof (value as { code?: unknown }).code === 'string' &&
    (value as PgErrorShape).code !== undefined
  );
}

function humanizeConstraint(constraint: string | undefined): string {
  switch (constraint) {
    case 'accounts_code_unique':
      return 'An account with this code already exists';
    case 'accounting_periods_year_number_unique':
      return 'An accounting period already exists for this year and period number';
    default:
      return 'The value conflicts with an existing record';
  }
}

/**
 * Translates a low-level PostgreSQL driver error into a typed
 * {@link AccountingError}. Unknown errors are wrapped as a generic 500
 * without leaking driver internals.
 */
export function mapPgError(error: unknown): AccountingError {
  if (error instanceof AccountingError) {
    return error;
  }

  if (!isPgError(error)) {
    return new AccountingError(
      'The accounting operation failed unexpectedly',
      'ACCOUNTING_INTERNAL_ERROR',
      500,
      error
    );
  }

  switch (error.code) {
    case PG_ERROR_CODES.UNIQUE_VIOLATION:
      return new AccountingConflictError(humanizeConstraint(error.constraint), error);
    case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return new AccountingValidationError('Referenced record does not exist', error);
    case PG_ERROR_CODES.CHECK_VIOLATION:
      return new AccountingValidationError(
        `Database constraint violated${error.constraint ? ` (${error.constraint})` : ''}`,
        error
      );
    case PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION:
      return new AccountingValidationError('Malformed identifier supplied', error);
    case PG_ERROR_CODES.SERIALIZATION_FAILURE:
    case PG_ERROR_CODES.DEADLOCK_DETECTED:
      return new AccountingConflictError(
        'Concurrent update detected - please retry the operation',
        error
      );
    default:
      return new AccountingError(
        'The accounting database rejected the operation',
        'ACCOUNTING_DB_ERROR',
        500,
        error
    );
  }
}
