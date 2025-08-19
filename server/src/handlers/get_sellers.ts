import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { type Seller } from '../schema';

export const getSellers = async (): Promise<Seller[]> => {
  try {
    const results = await db.select()
      .from(l4_sellers)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(seller => ({
      ...seller,
      permanent_rounding_bonus: parseFloat(seller.permanent_rounding_bonus)
    }));
  } catch (error) {
    console.error('Failed to fetch sellers:', error);
    throw error;
  }
};