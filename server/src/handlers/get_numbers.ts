import { db } from '../db';
import { l4_numbers } from '../db/schema';
import { type Number } from '../schema';

export const getNumbers = async (): Promise<Number[]> => {
  try {
    // Fetch all numbers from the database
    const results = await db.select()
      .from(l4_numbers)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(number => ({
      ...number,
      price: parseFloat(number.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch numbers:', error);
    throw error;
  }
};