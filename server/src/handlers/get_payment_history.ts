import { db } from '../db';
import { l4_billing_records } from '../db/schema';
import { type GetPaymentHistoryInput, type BillingRecord } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getPaymentHistory = async (input: GetPaymentHistoryInput): Promise<BillingRecord[]> => {
  try {
    // Build query with filters and pagination
    const results = await db.select()
      .from(l4_billing_records)
      .where(eq(l4_billing_records.buyer_id, input.buyer_id))
      .orderBy(desc(l4_billing_records.billing_date))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(record => ({
      ...record,
      amount: parseFloat(record.amount) // Convert numeric string back to number
    }));
  } catch (error) {
    console.error('Payment history retrieval failed:', error);
    throw error;
  }
};