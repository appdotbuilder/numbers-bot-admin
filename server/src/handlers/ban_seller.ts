import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { type BanSellerInput, type Seller } from '../schema';
import { eq } from 'drizzle-orm';

export const banSeller = async (input: BanSellerInput): Promise<Seller> => {
  try {
    // Update seller status to 'banned' and set status comment
    const result = await db.update(l4_sellers)
      .set({
        status: 'banned',
        status_comment: input.status_comment || 'Banned by administrator',
        updated_at: new Date()
      })
      .where(eq(l4_sellers.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Seller with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const seller = result[0];
    return {
      ...seller,
      permanent_rounding_bonus: parseFloat(seller.permanent_rounding_bonus)
    };
  } catch (error) {
    console.error('Seller ban failed:', error);
    throw error;
  }
};