import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateBuyerInput, type Buyer } from '../schema';

export const updateBuyer = async (input: UpdateBuyerInput): Promise<Buyer> => {
  try {
    // Build update object with only the fields that are provided
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.mode !== undefined) {
      updateData['mode'] = input.mode;
    }
    if (input.max_numbers_per_branch !== undefined) {
      updateData['max_numbers_per_branch'] = input.max_numbers_per_branch;
    }

    // Update the buyer record
    const result = await db.update(l4_buyers)
      .set(updateData)
      .where(eq(l4_buyers.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Buyer with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const buyer = result[0];
    return {
      ...buyer,
      // No numeric conversions needed for buyers table
    };
  } catch (error) {
    console.error('Buyer update failed:', error);
    throw error;
  }
};