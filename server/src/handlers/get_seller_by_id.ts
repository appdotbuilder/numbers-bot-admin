import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { type Seller } from '../schema';
import { eq } from 'drizzle-orm';

export const getSellerById = async (id: number): Promise<Seller | null> => {
  try {
    const results = await db.select()
      .from(l4_sellers)
      .where(eq(l4_sellers.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const seller = results[0];
    return {
      ...seller,
      permanent_rounding_bonus: parseFloat(seller.permanent_rounding_bonus) // Convert numeric to number
    };
  } catch (error) {
    console.error('Get seller by ID failed:', error);
    throw error;
  }
};