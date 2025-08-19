import { db } from '../db';
import { l4_numbers } from '../db/schema';
import { type UpdateNumberStatusInput, type Number } from '../schema';
import { eq } from 'drizzle-orm';

export const updateNumberStatus = async (input: UpdateNumberStatusInput): Promise<Number> => {
  try {
    // Prepare the update values
    const updateValues: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Set completed_at timestamp for completed status
    if (input.status === 'completed') {
      updateValues.completed_at = new Date();
    }

    // Clear completed_at for non-completed statuses
    if (input.status !== 'completed') {
      updateValues.completed_at = null;
    }

    // For returned_to_queue and cancelled statuses, clear buyer assignment
    if (input.status === 'returned_to_queue' || input.status === 'cancelled') {
      updateValues.buyer_id = null;
      updateValues.rented_at = null;
    }

    // Update the number record
    const result = await db.update(l4_numbers)
      .set(updateValues)
      .where(eq(l4_numbers.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Number with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const number = result[0];
    return {
      ...number,
      price: parseFloat(number.price)
    };
  } catch (error) {
    console.error('Number status update failed:', error);
    throw error;
  }
};