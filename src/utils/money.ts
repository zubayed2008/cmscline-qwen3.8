/**
 * Money utilities - the ONLY place monetary arithmetic happens in
 * application code. All amounts cross boundaries as fixed 2-decimal
 * STRINGS ("1250.50"), matching PostgreSQL NUMERIC(18,2) columns which
 * Drizzle returns as strings.
 *
 * Backed by decimal.js (already a project dependency). Floats never touch
 * money: parsing rejects anything that is not an exact decimal literal.
 */
import Decimal from 'decimal.js';

export const DECIMAL_PLACES = 2;

// Round-half-up matches conventional financial display expectations.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/** Thrown when a value cannot be interpreted as a valid money amount. */
export class MoneyFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyFormatError';
  }
}

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/**
 * Parses an arbitrary input into a canonical 2-decimal money string.
 * Accepts numeric strings ("12", "12.5", "12.50"); throws on floats with
 * extra precision, NaN/Infinity, objects and empty strings.
 */
export function parseMoney(value: unknown): string {
  if (typeof value === 'number') {
    // Numbers are tolerated only when exactly representable at <=2 dp.
    if (!Number.isFinite(value)) {
      throw new MoneyFormatError(`Invalid money amount: ${String(value)}`);
    }
    return parseMoney(value.toFixed(DECIMAL_PLACES));
  }

  if (typeof value !== 'string' || !MONEY_PATTERN.test(value.trim())) {
    throw new MoneyFormatError(
      `Invalid money amount: ${String(value)}. Expected a decimal string with at most 2 fraction digits.`
    );
  }

  return new Decimal(value.trim()).toFixed(DECIMAL_PLACES);
}

/** Non-throwing variant of {@link parseMoney}; returns null when invalid. */
export function tryParseMoney(value: unknown): string | null {
  try {
    return parseMoney(value);
  } catch {
    return null;
  }
}

function toDecimal(value: unknown): Decimal {
  const parsed = tryParseMoney(value);
  if (parsed === null) {
    throw new MoneyFormatError(`Invalid money amount: ${String(value)}`);
  }
  return new Decimal(parsed);
}

export function addMoney(a: unknown, b: unknown): string {
  return toDecimal(a).plus(toDecimal(b)).toFixed(DECIMAL_PLACES);
}

export function subtractMoney(a: unknown, b: unknown): string {
  return toDecimal(a).minus(toDecimal(b)).toFixed(DECIMAL_PLACES);
}

/** Line-total helper: quantity x unit price, rounded half-up to 2 dp. */
export function multiplyMoney(quantity: number | string, unitPrice: unknown): string {
  const qty = typeof quantity === 'string' ? parseMoney(quantity) : quantity;
  if (typeof qty === 'number' && (!Number.isFinite(qty) || qty < 0)) {
    throw new MoneyFormatError(`Invalid quantity: ${String(quantity)}`);
  }
  return toDecimal(qty).times(toDecimal(unitPrice)).toFixed(DECIMAL_PLACES);
}

export function compareMoney(a: unknown, b: unknown): -1 | 0 | 1 {
  return toDecimal(a).comparedTo(toDecimal(b)) as -1 | 0 | 1;
}

export function isMoneyZero(value: unknown): boolean {
  return toDecimal(value).isZero();
}

export function isMoneyNegative(value: unknown): boolean {
  return toDecimal(value).isNegative();
}

/** Sum of any number of money values (empty sums are "0.00"). */
export function sumMoney(values: readonly unknown[]): string {
  return values.reduce<string>((acc, v) => addMoney(acc, v), '0.00');
}

/**
 * Tax / surcharge helper: `percent` is applied to `amount` and rounded
 * half-up to 2 dp. `percent` must be in [0, 100] (e.g. 5 for 5%).
 */
export function percentOfMoney(amount: unknown, percent: number | string): string {
  return toDecimal(amount)
    .times(new Decimal(percent))
    .div(100)
    .toFixed(DECIMAL_PLACES);
}
