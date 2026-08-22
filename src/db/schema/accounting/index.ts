/**
 * Accounting schema barrel.
 *
 * drizzle-kit (`drizzle.config.ts`) loads this file to discover the full
 * table set. Part 1 ships the foundation tables; journal, invoice, bill and
 * payment tables join here in later parts without changing this file's role.
 */
export * from './enums';
export * from './foundation';
export * from './journal-entries';
export * from './idempotency-records';
export * from './customers';
export * from './invoices';
export * from './payments';
export * from './vendors';
export * from './vendor-bills';
