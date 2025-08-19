import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { type CreateSellerInput, type Seller, createSellerInputSchema } from '../schema';

export const createSeller = async (input: CreateSellerInput): Promise<Seller> => {
  // Parse input to apply Zod defaults
  const parsedInput = createSellerInputSchema.parse(input);
  try {
    // Insert seller record
    const result = await db.insert(l4_sellers)
      .values({
        telegram_id: parsedInput.telegram_id,
        status: parsedInput.status,
        status_comment: parsedInput.status_comment || null,
        permanent_rounding_bonus: parsedInput.permanent_rounding_bonus.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const seller = result[0];
    return {
      ...seller,
      permanent_rounding_bonus: parseFloat(seller.permanent_rounding_bonus) // Convert string back to number
    };
  } catch (error) {
    console.error('Seller creation failed:', error);
    throw error;
  }
};