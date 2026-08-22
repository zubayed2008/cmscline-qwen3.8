import {
  DECIMAL_PLACES,
  MoneyFormatError,
  addMoney,
  compareMoney,
  isMoneyNegative,
  isMoneyZero,
  multiplyMoney,
  parseMoney,
  subtractMoney,
  sumMoney,
  tryParseMoney,
} from '@/utils/money';

describe('money utilities', () => {
  describe('parseMoney', () => {
    it.each([
      ['1250.50', '1250.50'],
      ['12', '12.00'],
      ['12.5', '12.50'],
      ['0', '0.00'],
      ['0.00', '0.00'],
      ['-45.10', '-45.10'],
    ])('normalizes %s to %s', (input, expected) => {
      expect(parseMoney(input)).toBe(expected);
    });

    it('accepts finite numbers that are exact at 2 decimals', () => {
      expect(parseMoney(12.5)).toBe('12.50');
    });

    it.each(['12.505', '', 'abc', 'NaN', 'Infinity', '1,000.00'])(
      'rejects invalid string %s',
      (input) => {
        expect(() => parseMoney(input)).toThrow(MoneyFormatError);
      }
    );

    it('rejects NaN and Infinity numbers', () => {
      expect(() => parseMoney(Number.NaN)).toThrow(MoneyFormatError);
      expect(() => parseMoney(Number.POSITIVE_INFINITY)).toThrow(MoneyFormatError);
    });

    it('rejects non-string non-number inputs', () => {
      expect(() => parseMoney({ amount: 1 })).toThrow(MoneyFormatError);
      expect(() => parseMoney(null)).toThrow(MoneyFormatError);
    });
  });

  describe('tryParseMoney', () => {
    it('returns null instead of throwing on invalid input', () => {
      expect(tryParseMoney('12.345')).toBeNull();
    });

    it('returns the canonical string on valid input', () => {
      expect(tryParseMoney('7')).toBe('7.00');
    });
  });

  describe('arithmetic', () => {
    it('adds without binary floating point drift', () => {
      // 0.01 + 0.02 === 0.030000000000000002 in IEEE-754
      expect(addMoney('0.01', '0.02')).toBe('0.03');
    });

    it('adds large cent-exact values correctly', () => {
      expect(addMoney('9999999999999.99', '0.01')).toBe('10000000000000.00');
    });

    it('subtracts and allows negative results at utility level', () => {
      expect(subtractMoney('1.00', '0.25')).toBe('0.75');
      expect(subtractMoney('10.00', '10.25')).toBe('-0.25');
    });

    it('multiplies quantity by unit price', () => {
      expect(multiplyMoney(3, '19.99')).toBe('59.97');
      expect(multiplyMoney('2.5', '10.00')).toBe('25.00');
    });

    it('rounds products half-up when multiplication produces sub-cent precision', () => {
      // 2.5 x 19.99 = 49.975 -> half-up -> 49.98
      expect(multiplyMoney(2.5, '19.99')).toBe('49.98');
    });

    it('keeps two decimal places everywhere', () => {
      expect(DECIMAL_PLACES).toBe(2);
    });
  });

  describe('comparison and predicates', () => {
    it('compares amounts numerically, not lexically', () => {
      expect(compareMoney('9.99', '10.00')).toBe(-1);
      expect(compareMoney('10.00', '9.99')).toBe(1);
      expect(compareMoney('10.00', '10')).toBe(0);
    });

    it('detects zero and negative amounts', () => {
      expect(isMoneyZero('0.00')).toBe(true);
      expect(isMoneyZero('0.01')).toBe(false);
      expect(isMoneyNegative('-0.01')).toBe(true);
      expect(isMoneyNegative('0.00')).toBe(false);
    });

    it('sums variadic lists without drift', () => {
      expect(sumMoney(['0.1', '0.2'])).toBe('0.30');
      expect(sumMoney([])).toBe('0.00');
      expect(sumMoney(['100.00', '200.01', '-50.00'])).toBe('250.01');
    });

    it('throws MoneyFormatError on invalid operands in arithmetic', () => {
      expect(() => addMoney('abc', '1.00')).toThrow(MoneyFormatError);
      expect(() => subtractMoney('1.00', undefined)).toThrow(MoneyFormatError);
    });
  });
});

