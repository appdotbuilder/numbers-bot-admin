import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { type BanBuyerInput, type Buyer } from '../schema';
import { eq } from 'drizzle-orm';

export const banBuyer = async (input: BanBuyerInput): Promise<Buyer> => {
  try {
    // Update buyer record to set is_banned to true and record ban reason
    const result = await db.update(l4_buyers)
      .set({
        is_banned: true,
        ban_reason: input.ban_reason,
        updated_at: new Date()
      })
      .where(eq(l4_buyers.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Buyer with ID ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const buyer = result[0];
    return {
      ...buyer,
      // No numeric conversions needed for this table
    };
  } catch (error) {
    console.error('Buyer banning failed:', error);
    throw error;
  }
};