import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { type Buyer } from '../schema';
import { eq } from 'drizzle-orm';

export const unbanBuyer = async (buyerId: number): Promise<Buyer> => {
  try {
    // Update the buyer to unban them
    const result = await db.update(l4_buyers)
      .set({
        is_banned: false,
        ban_reason: null,
        updated_at: new Date()
      })
      .where(eq(l4_buyers.id, buyerId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Buyer with id ${buyerId} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const buyer = result[0];
    return {
      ...buyer,
      // No numeric fields to convert in buyer schema
    };
  } catch (error) {
    console.error('Buyer unban failed:', error);
    throw error;
  }
};