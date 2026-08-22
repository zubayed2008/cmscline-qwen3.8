/**
 * Deterministic seed for the accounting engine (spec §29) - Chart of
 * Accounts plus the current fiscal year's 12 OPEN periods.
 *
 * Idempotent: account rows use FIXED ids (onConflictDoNothing), so safe to
 * re-run any time. Run:
 *   npx ts-node --project tsconfig.seed.json scripts/seed-accounting.ts
 */
import { accounts } from '@/db/schema/accounting';
import { getAccountingDb, closeAccountingPool } from '@/db/pg-client';
import { PeriodService } from '@/services/accounting/period-service';

interface SeedAccount {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  parentId: string | null;
  isPostable: boolean;
}

const UUID_PREFIX = '00000000-0000-4000-8000-';
const uid = (suffix: string): string => `${UUID_PREFIX}${suffix}`;

const SEED_ACCOUNTS: SeedAccount[] = [
  { id: uid('000000000001'), code: '1000', name: 'Assets', type: 'Asset', parentId: null, isPostable: false },
  { id: uid('000000000002'), code: '1100', name: 'Cash', type: 'Asset', parentId: uid('000000000001'), isPostable: true },
  { id: uid('000000000003'), code: '1200', name: 'Accounts Receivable', type: 'Asset', parentId: uid('000000000001'), isPostable: true },
  { id: uid('000000000004'), code: '1300', name: 'Bank', type: 'Asset', parentId: uid('000000000001'), isPostable: true },
  { id: uid('000000000005'), code: '2000', name: 'Liabilities', type: 'Liability', parentId: null, isPostable: false },
  { id: uid('000000000006'), code: '2100', name: 'Accounts Payable', type: 'Liability', parentId: uid('000000000005'), isPostable: true },
  { id: uid('000000000007'), code: '2200', name: 'Tax Payable', type: 'Liability', parentId: uid('000000000005'), isPostable: true },
  { id: uid('000000000008'), code: '3000', name: 'Equity', type: 'Equity', parentId: null, isPostable: false },
  { id: uid('000000000009'), code: '3100', name: 'Owner Equity', type: 'Equity', parentId: uid('000000000008'), isPostable: true },
  { id: uid('000000000010'), code: '4000', name: 'Revenue', type: 'Revenue', parentId: null, isPostable: false },
  { id: uid('000000000011'), code: '4100', name: 'Sales Revenue', type: 'Revenue', parentId: uid('000000000010'), isPostable: true },
  { id: uid('000000000012'), code: '5000', name: 'Expenses', type: 'Expense', parentId: null, isPostable: false },
  { id: uid('000000000013'), code: '5100', name: 'Office Expense', type: 'Expense', parentId: uid('000000000012'), isPostable: true },
  { id: uid('000000000014'), code: '5200', name: 'Utilities Expense', type: 'Expense', parentId: uid('000000000012'), isPostable: true },
];

async function main(): Promise<void> {
  const db = getAccountingDb();

  const createdPeriods = await PeriodService.seedCurrentYearPeriods(db);
  console.log(`[seed:accounting] ensured ${createdPeriods} periods, ${SEED_ACCOUNTS.length} accounts`);

  for (const account of SEED_ACCOUNTS) {
    await db
      .insert(accounts)
      .values({
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance:
          account.type === 'Asset' || account.type === 'Expense' ? 'Debit' : 'Credit',
        parentId: account.parentId,
        isActive: true,
        isPostable: account.isPostable,
        createdByName: 'seed:accounting',
      })
      .onConflictDoNothing();
  }

  console.log('Seed complete');
  await closeAccountingPool();
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});