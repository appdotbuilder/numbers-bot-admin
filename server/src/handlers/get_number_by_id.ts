import { db } from '../db';
import { l4_numbers } from '../db/schema';
import { type Number } from '../schema';
import { eq } from 'drizzle-orm';

export const getNumberById = async (id: number): Promise<Number | null> => {
  try {
    // Query the number by ID
    const results = await db.select()
      .from(l4_numbers)
      .where(eq(l4_numbers.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const numberRecord = results[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...numberRecord,
      price: parseFloat(numberRecord.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Get number by ID failed:', error);
    throw error;
  }
};