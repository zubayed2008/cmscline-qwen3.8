import {
  AccountingConflictError,
  AccountingError,
  AccountingNotFoundError,
  AccountingValidationError,
  PeriodClosedError,
  UnbalancedEntryError,
  mapPgError,
} from '@/utils/accounting-errors';

/** Builds a fake node-postgres error carrying SQLSTATE + constraint fields. */
function pgError(code: string, constraint?: string): Error {
  const error = new Error(`pg error ${code}`);
  Object.assign(error, { code, constraint });
  return error;
}

describe('accounting error mapping', () => {
  it('passes through already-typed AccountingErrors untouched', () => {
    const original = new PeriodClosedError('FY2026-01');
    expect(mapPgError(original)).toBe(original);
  });

  it('wraps non-error values as a generic internal error', () => {
    const mapped = mapPgError('boom');
    expect(mapped).toBeInstanceOf(AccountingError);
    expect(mapped.code).toBe('ACCOUNTING_INTERNAL_ERROR');
    expect(mapped.httpStatus).toBe(500);
  });

  it('wraps plain errors without a SQLSTATE code as internal errors', () => {
    const mapped = mapPgError(new Error('connection refused'));
    expect(mapped.code).toBe('ACCOUNTING_INTERNAL_ERROR');
    expect(mapped.httpStatus).toBe(500);
    // The original error is preserved for server-side logging only.
    expect(mapped.cause).toBeInstanceOf(Error);
  });

  describe('unique violations', () => {
    it('maps duplicate account codes to a humanized conflict', () => {
      const mapped = mapPgError(pgError('23505', 'accounts_code_unique'));
      expect(mapped).toBeInstanceOf(AccountingConflictError);
      expect(mapped.httpStatus).toBe(409);
      expect(mapped.message).toContain('account with this code');
    });

    it('maps duplicate period keys to the period-specific message', () => {
      const mapped = mapPgError(pgError('23505', 'accounting_periods_year_number_unique'));
      expect(mapped.httpStatus).toBe(409);
      expect(mapped.message).toContain('period');
    });

    it('falls back to a generic conflict message for unknown constraints', () => {
      const mapped = mapPgError(pgError('23505'));
      expect(mapped.httpStatus).toBe(409);
      expect(mapped.message).toContain('conflicts with an existing record');
    });
  });

  it('maps foreign key violations to validation errors (400)', () => {
    const mapped = mapPgError(pgError('23503'));
    expect(mapped).toBeInstanceOf(AccountingValidationError);
    expect(mapped.httpStatus).toBe(400);
  });

  it('maps check violations to validation errors naming the constraint', () => {
    const mapped = mapPgError(pgError('23514', 'accounts_normal_balance_matches_type'));
    expect(mapped).toBeInstanceOf(AccountingValidationError);
    expect(mapped.httpStatus).toBe(400);
    expect(mapped.message).toContain('accounts_normal_balance_matches_type');
  });

  it('maps malformed identifiers to validation errors (400)', () => {
    const mapped = mapPgError(pgError('22P02'));
    expect(mapped).toBeInstanceOf(AccountingValidationError);
    expect(mapped.message).toContain('Malformed identifier');
  });

  it.each(['40001', '40P01'])(
    'maps concurrency failure %s to a retryable conflict (409)',
    (sqlState) => {
      const mapped = mapPgError(pgError(sqlState));
      expect(mapped).toBeInstanceOf(AccountingConflictError);
      expect(mapped.httpStatus).toBe(409);
      expect(mapped.message).toMatch(/retry/i);
    }
  );

  it('maps unrecognized SQLSTATE codes to database errors (500)', () => {
    const mapped = mapPgError(pgError('42601'));
    expect(mapped.code).toBe('ACCOUNTING_DB_ERROR');
    expect(mapped.httpStatus).toBe(500);
  });
});

describe('typed accounting errors', () => {
  it('exposes stable codes and HTTP statuses', () => {
    expect(new AccountingNotFoundError('Account', 'abc').httpStatus).toBe(404);
    expect(new AccountingNotFoundError('Account', 'abc').code).toBe('ACCOUNTING_NOT_FOUND');
    expect(new UnbalancedEntryError('JE-2026-000001').httpStatus).toBe(422);
    expect(new UnbalancedEntryError('JE-2026-000001').code).toBe('UNBALANCED_ENTRY');
    expect(new PeriodClosedError('FY2026-01').code).toBe('PERIOD_CLOSED');
    expect(new AccountingConflictError('dup').code).toBe('ACCOUNTING_CONFLICT');
    expect(new AccountingValidationError('bad').code).toBe('ACCOUNTING_VALIDATION_FAILED');
  });
});
