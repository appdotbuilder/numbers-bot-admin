import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { type Buyer } from '../schema';

export const getBuyers = async (): Promise<Buyer[]> => {
  try {
    const result = await db.select()
      .from(l4_buyers)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch buyers:', error);
    throw error;
  }
};