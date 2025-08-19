import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { type CreateBuyerInput, type Buyer } from '../schema';

export const createBuyer = async (input: CreateBuyerInput): Promise<Buyer> => {
  try {
    // Insert buyer record
    const result = await db.insert(l4_buyers)
      .values({
        name: input.name,
        mode: input.mode,
        chat_id: input.chat_id,
        max_numbers_per_branch: input.max_numbers_per_branch,
        is_banned: false, // Default value
        ban_reason: null, // Default value
      })
      .returning()
      .execute();

    // Return the created buyer
    const buyer = result[0];
    return buyer;
  } catch (error) {
    console.error('Buyer creation failed:', error);
    throw error;
  }
};