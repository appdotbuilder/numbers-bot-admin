import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { type Buyer } from '../schema';
import { eq } from 'drizzle-orm';

export const getBuyerById = async (id: number): Promise<Buyer | null> => {
  try {
    const results = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const buyer = results[0];
    return {
      ...buyer,
      // Convert numeric fields back to numbers
      max_numbers_per_branch: buyer.max_numbers_per_branch
    };
  } catch (error) {
    console.error('Failed to fetch buyer by ID:', error);
    throw error;
  }
};