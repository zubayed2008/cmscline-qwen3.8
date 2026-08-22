/**
 * Customer master data (spec §11.1).
 *
 * Soft-deletion only: invoices/payments reference customers forever, so a
 * customer can be deactivated (`status = INACTIVE`) but never hard-deleted.
 * Codes are generated from the same concurrency-safe counter that numbers
 * financial documents (CUS-2026-000001).
 */
import { asc, eq } from 'drizzle-orm';
import { customers, invoices, type CustomerRow, type InvoiceRow } from '@/db/schema/accounting';
import {
  AccountingConflictError,
  AccountingNotFoundError,
  AccountingValidationError,
} from '@/utils/accounting-errors';
import type { PartyStatus } from '@/types/accounting-types';
import { addMoney } from '@/utils/money';
import { NumberService } from './number-service';
import { resolveExec, type AccountingExec } from './service-types';

export interface CreateCustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  createdByName?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  status?: PartyStatus;
}

export const CustomerService = {
  /** Creates a customer with a generated unique code. */
  async createCustomer(input: CreateCustomerInput, exec?: AccountingExec): Promise<CustomerRow> {
    const db = resolveExec(exec);
    const name = input.name?.trim();
    if (!name) {
      throw new AccountingValidationError('Customer name is required');
    }
    const code = await NumberService.nextDocumentNumber(
      db,
      'CUS',
      new Date().getUTCFullYear()
    );

    try {
      const [row] = await db
        .insert(customers)
        .values({
          code,
          name,
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          address: input.address?.trim() || null,
          taxId: input.taxId?.trim() || null,
          createdByName: input.createdByName ?? null,
        })
        .returning();
      return row!;
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new AccountingConflictError(
          'A customer with this email address already exists'
        );
      }
      throw error;
    }
  },

  async updateCustomer(id: string, input: UpdateCustomerInput, exec?: AccountingExec): Promise<CustomerRow> {
    const db = resolveExec(exec);
    const [current] = await db.select().from(customers).where(eq(customers.id, id));
    if (!current) throw new AccountingNotFoundError('Customer', id);

    try {
      const [updated] = await db
        .update(customers)
        .set({
          name: input.name?.trim() || current.name,
          email: input.email !== undefined ? input.email?.trim() || null : current.email,
          phone: input.phone !== undefined ? input.phone?.trim() || null : current.phone,
          address: input.address !== undefined ? input.address?.trim() || null : current.address,
          taxId: input.taxId !== undefined ? input.taxId?.trim() || null : current.taxId,
          status: input.status ?? current.status,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, id))
        .returning();
      return updated!;
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new AccountingConflictError(
          'A customer with this email address already exists'
        );
      }
      throw error;
    }
  },

  async getById(id: string, exec?: AccountingExec): Promise<CustomerRow> {
    const [row] = await resolveExec(exec).select().from(customers).where(eq(customers.id, id));
    if (!row) throw new AccountingNotFoundError('Customer', id);
    return row;
  },

  async listCustomers(exec?: AccountingExec): Promise<CustomerRow[]> {
    return resolveExec(exec).select().from(customers).orderBy(asc(customers.name));
  },

  /**
   * Customer statement: all invoices (newest due first) plus the aggregate
   * outstanding balance (spec §11, used by the reports/UI).
   */
  async getCustomerStatement(
    customerId: string,
    exec?: AccountingExec
  ): Promise<{
    customer: CustomerRow;
    invoices: InvoiceRow[];
    totalBalanceDue: string;
  }> {
    const db = resolveExec(exec);
    const customer = await this.getById(customerId, db);
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(asc(invoices.dueDate), asc(invoices.createdAt));

    const totalBalanceDue = rows.reduce<string>(
      (sum, row) => addMoney(sum, row.balanceDue),
      '0.00'
    );

    return { customer, invoices: rows, totalBalanceDue };
  },
};