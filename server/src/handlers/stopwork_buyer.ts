import { db } from '../db';
import { l4_buyers, l4_numbers } from '../db/schema';
import { type StopworkBuyerInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const stopworkBuyer = async (input: StopworkBuyerInput): Promise<{ success: boolean; message: string }> => {
  try {
    // First, verify the buyer exists
    const buyer = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, input.id))
      .execute();

    if (buyer.length === 0) {
      return {
        success: false,
        message: `Buyer with ID ${input.id} not found.`
      };
    }

    // Check if buyer is already banned
    if (buyer[0].is_banned) {
      return {
        success: false,
        message: `Buyer ${input.id} is already banned and cannot have stopwork applied.`
      };
    }

    // Get all accepted numbers for this buyer
    const acceptedNumbers = await db.select()
      .from(l4_numbers)
      .where(
        and(
          eq(l4_numbers.buyer_id, input.id),
          eq(l4_numbers.status, 'accepted')
        )
      )
      .execute();

    // Move all accepted numbers to returned_to_queue status
    // Also clear the buyer_id to release the numbers
    if (acceptedNumbers.length > 0) {
      await db.update(l4_numbers)
        .set({
          status: 'returned_to_queue',
          buyer_id: null,
          updated_at: new Date()
        })
        .where(
          and(
            eq(l4_numbers.buyer_id, input.id),
            eq(l4_numbers.status, 'accepted')
          )
        )
        .execute();
    }

    // Ban the buyer to prevent future rentals
    await db.update(l4_buyers)
      .set({
        is_banned: true,
        ban_reason: 'Stopwork applied - automatic ban to prevent future rentals',
        updated_at: new Date()
      })
      .where(eq(l4_buyers.id, input.id))
      .execute();

    const message = acceptedNumbers.length > 0 
      ? `Stopwork completed for buyer ${input.id}. ${acceptedNumbers.length} accepted numbers moved to queue and buyer banned.`
      : `Stopwork completed for buyer ${input.id}. No accepted numbers found, buyer banned to prevent future rentals.`;

    return {
      success: true,
      message
    };
  } catch (error) {
    console.error('Stopwork operation failed:', error);
    throw error;
  }
};