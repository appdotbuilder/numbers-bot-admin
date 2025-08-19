import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { type UpdateSellerInput, type Seller } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSeller = async (input: UpdateSellerInput): Promise<Seller> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.status_comment !== undefined) {
      updateData.status_comment = input.status_comment;
    }

    if (input.permanent_rounding_bonus !== undefined) {
      updateData.permanent_rounding_bonus = input.permanent_rounding_bonus.toString();
    }

    // Update the seller record
    const result = await db.update(l4_sellers)
      .set(updateData)
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
    console.error('Seller update failed:', error);
    throw error;
  }
};