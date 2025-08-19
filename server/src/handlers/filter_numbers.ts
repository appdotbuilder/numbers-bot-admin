import { db } from '../db';
import { l4_numbers } from '../db/schema';
import { type FilterNumbersInput, type Number } from '../schema';
import { eq, and, ilike, type SQL } from 'drizzle-orm';

export const filterNumbers = async (input: FilterNumbersInput): Promise<Number[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by country (exact match)
    if (input.country) {
      conditions.push(eq(l4_numbers.country, input.country));
    }

    // Filter by type (exact match)
    if (input.type) {
      conditions.push(eq(l4_numbers.type, input.type));
    }

    // Filter by status (exact match)
    if (input.status) {
      conditions.push(eq(l4_numbers.status, input.status));
    }

    // Filter by buyer_id (exact match, handles null properly)
    if (input.buyer_id) {
      conditions.push(eq(l4_numbers.buyer_id, input.buyer_id));
    }

    // Filter by seller_id (exact match, handles null properly)
    if (input.seller_id) {
      conditions.push(eq(l4_numbers.seller_id, input.seller_id));
    }

    // Filter by phone number (case-insensitive partial match)
    if (input.phone_number) {
      conditions.push(ilike(l4_numbers.phone_number, `%${input.phone_number}%`));
    }

    // Build and execute query with or without conditions
    const results = conditions.length > 0
      ? await db.select().from(l4_numbers).where(and(...conditions)).execute()
      : await db.select().from(l4_numbers).execute();

    // Convert numeric fields back to numbers before returning
    return results.map(number => ({
      ...number,
      price: parseFloat(number.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Number filtering failed:', error);
    throw error;
  }
};