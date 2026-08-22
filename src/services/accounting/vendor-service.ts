/**
 * Vendor master data (spec §11.1).
 *
 * Soft-deletion only: bills/payments reference vendors forever, so a
 * vendor can be deactivated (`status = INACTIVE`) but never hard-deleted.
 * Codes are generated from the same concurrency-safe counter that numbers
 * financial documents (VEN-2026-000001).
 */
import { asc, eq } from 'drizzle-orm';
import {
  vendors,
  vendorBills,
  type VendorBillRow,
  type VendorRow,
} from '@/db/schema/accounting';
import {
  AccountingConflictError,
  AccountingNotFoundError,
  AccountingValidationError,
} from '@/utils/accounting-errors';
import type { PartyStatus } from '@/types/accounting-types';
import { addMoney } from '@/utils/money';
import { NumberService } from './number-service';
import { resolveExec, type AccountingExec } from './service-types';

export interface CreateVendorInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  createdByName?: string | null;
}

export interface UpdateVendorInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  status?: PartyStatus;
}

export const VendorService = {
  /** Creates a vendor with a generated unique code. */
  async createVendor(input: CreateVendorInput, exec?: AccountingExec): Promise<VendorRow> {
    const db = resolveExec(exec);
    const name = input.name?.trim();
    if (!name) {
      throw new AccountingValidationError('Vendor name is required');
    }
    const code = await NumberService.nextDocumentNumber(
      db,
      'VEN',
      new Date().getUTCFullYear()
    );

    try {
      const [row] = await db
        .insert(vendors)
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
          'A vendor with this email address already exists'
        );
      }
      throw error;
    }
  },

  async updateVendor(id: string, input: UpdateVendorInput, exec?: AccountingExec): Promise<VendorRow> {
    const db = resolveExec(exec);
    const [current] = await db.select().from(vendors).where(eq(vendors.id, id));
    if (!current) throw new AccountingNotFoundError('Vendor', id);

    try {
      const [updated] = await db
        .update(vendors)
        .set({
          name: input.name?.trim() || current.name,
          email: input.email !== undefined ? input.email?.trim() || null : current.email,
          phone: input.phone !== undefined ? input.phone?.trim() || null : current.phone,
          address: input.address !== undefined ? input.address?.trim() || null : current.address,
          taxId: input.taxId !== undefined ? input.taxId?.trim() || null : current.taxId,
          status: input.status ?? current.status,
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, id))
        .returning();
      return updated!;
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new AccountingConflictError(
          'A vendor with this email address already exists'
        );
      }
      throw error;
    }
  },

  async getById(id: string, exec?: AccountingExec): Promise<VendorRow> {
    const [row] = await resolveExec(exec).select().from(vendors).where(eq(vendors.id, id));
    if (!row) throw new AccountingNotFoundError('Vendor', id);
    return row;
  },

  async listVendors(exec?: AccountingExec): Promise<VendorRow[]> {
    return resolveExec(exec).select().from(vendors).orderBy(asc(vendors.name));
  },

  /**
   * Vendor statement: all bills (newest due first) plus the aggregate
   * outstanding balance (spec §11, used by the reports/UI).
   */
  async getVendorStatement(
    vendorId: string,
    exec?: AccountingExec
  ): Promise<{
    vendor: VendorRow;
    bills: VendorBillRow[];
    totalBalanceDue: string;
  }> {
    const db = resolveExec(exec);
    const vendor = await this.getById(vendorId, db);
    const rows = await db
      .select()
      .from(vendorBills)
      .where(eq(vendorBills.vendorId, vendorId))
      .orderBy(asc(vendorBills.dueDate), asc(vendorBills.createdAt));

    const totalBalanceDue = rows.reduce<string>(
      (sum, row) => addMoney(sum, row.balanceDue),
      '0.00'
    );

    return { vendor, bills: rows, totalBalanceDue };
  },
};
