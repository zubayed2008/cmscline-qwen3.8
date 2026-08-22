/**
 * Chart of accounts management (spec §4).
 *
 * Accounts form a hierarchy: group/header nodes (`isPostable: false`) exist
 * only for reporting rollups; leaf nodes receive postings. Type changes are
 * forbidden once postings exist; deactivation is soft - financial rows must
 * keep their referential history, so there is no hard delete.
 */
import { asc, eq } from 'drizzle-orm';
import { accounts, journalPostings, type AccountRow } from '@/db/schema/accounting';
import {
  AccountHasPostingsError,
  AccountInactiveError,
  AccountNotPostableError,
  AccountingConflictError,
  AccountingNotFoundError,
  AccountingValidationError,
} from '@/utils/accounting-errors';
import type { AccountType, NormalBalance } from '@/types/accounting-types';
import { resolveExec, type AccountingExec } from './service-types';

/** Engine-enforced rule, mirrored here for friendly pre-flight errors. */
export function normalBalanceFor(type: AccountType): NormalBalance {
  return type === 'Asset' || type === 'Expense' ? 'Debit' : 'Credit';
}

export interface CreateAccountInput {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string | null;
  isPostable?: boolean;
  createdByName?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  parentId?: string | null;
  isPostable?: boolean;
}

export const AccountService = {
  /** Creates an account; normal balance is derived from type, never supplied. */
  async createAccount(input: CreateAccountInput, exec?: AccountingExec): Promise<AccountRow> {
    const db = resolveExec(exec);
    const code = input.code?.trim();
    const name = input.name?.trim();
    if (!code || !name) {
      throw new AccountingValidationError('Account code and name are required');
    }

    if (input.parentId) {
      const [parent] = await db.select().from(accounts).where(eq(accounts.id, input.parentId));
      if (!parent) {
        throw new AccountingValidationError(`Parent account ${input.parentId} not found`);
      }
      if (parent.isPostable) {
        throw new AccountingValidationError(
          `Parent ${parent.code} is a posting account - parents must be group accounts`
        );
      }
    }

    try {
      const [row] = await db
        .insert(accounts)
        .values({
          code,
          name,
          type: input.type,
          normalBalance: normalBalanceFor(input.type),
          parentId: input.parentId ?? null,
          isPostable: input.isPostable ?? true,
          createdByName: input.createdByName ?? null,
        })
        .returning();
      return row!;
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new AccountingConflictError(`Account code "${code}" already exists`);
      }
      throw error;
    }
  },

  /**
   * Updates name/type/parent/postable flag. Type change requires zero
   * historical postings (audit integrity); normal balance re-derives.
   */
  async updateAccount(
    id: string,
    input: UpdateAccountInput,
    exec?: AccountingExec
  ): Promise<AccountRow> {
    const db = resolveExec(exec);
    const [current] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!current) throw new AccountingNotFoundError('Account', id);

    const typeChanging = input.type !== undefined && input.type !== current.type;
    let hasPostings = false;
    if (typeChanging) {
      const referenced = await db
        .select({ id: journalPostings.id })
        .from(journalPostings)
        .where(eq(journalPostings.accountId, id))
        .limit(1);
      hasPostings = referenced.length > 0;
    }
    if (typeChanging && hasPostings && input.type) {
      throw new AccountHasPostingsError(current.code);
    }

    const newType = input.type ?? current.type;
    const [updated] = await db
      .update(accounts)
      .set({
        name: input.name?.trim() || current.name,
        type: newType,
        normalBalance: normalBalanceFor(newType),
        parentId: input.parentId !== undefined ? input.parentId : current.parentId,
        isPostable: input.isPostable !== undefined ? input.isPostable : current.isPostable,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id))
      .returning();
    return updated!;
  },

  /** Soft-deactivates. Rejected when any posting references the account. */
  async deactivateAccount(id: string, exec?: AccountingExec): Promise<AccountRow> {
    const db = resolveExec(exec);
    const [current] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!current) throw new AccountingNotFoundError('Account', id);

    const referenced = await db
      .select({ id: journalPostings.id })
      .from(journalPostings)
      .where(eq(journalPostings.accountId, id))
      .limit(1);
    if (referenced.length > 0) {
      throw new AccountHasPostingsError(current.code);
    }

    const [updated] = await db
      .update(accounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return updated!;
  },

  /** Flat chart ordered by code. */
  async listAccounts(exec?: AccountingExec): Promise<AccountRow[]> {
    return resolveExec(exec).select().from(accounts).orderBy(asc(accounts.code));
  },

  /**
   * Shared posting gate used by every flow that writes amounts:
   * the account must exist, be active, AND be postable (not a group header).
   */
  async getPostableAccount(exec: AccountingExec, accountId: string): Promise<AccountRow> {
    const [account] = await exec.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) throw new AccountingNotFoundError('Account', accountId);
    if (!account.isActive) throw new AccountInactiveError(account.code);
    if (!account.isPostable) throw new AccountNotPostableError(account.code);
    return account;
  },
};
