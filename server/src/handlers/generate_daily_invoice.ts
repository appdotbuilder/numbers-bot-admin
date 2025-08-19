import { db } from '../db';
import { l4_buyers, l4_numbers } from '../db/schema';
import { type GenerateDailyInvoiceInput, type DailyInvoice } from '../schema';
import { eq, gte, lt, and } from 'drizzle-orm';

export const generateDailyInvoice = async (input: GenerateDailyInvoiceInput): Promise<DailyInvoice> => {
  try {
    // Parse the date and create date range for the day
    const targetDate = new Date(input.date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get buyer information
    const buyers = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, input.buyer_id))
      .execute();

    if (buyers.length === 0) {
      throw new Error(`Buyer with id ${input.buyer_id} not found`);
    }

    const buyer = buyers[0];

    // Query numbers rented by this buyer on the specified date
    // We look for numbers where rented_at falls within the target date
    const rentedNumbers = await db.select()
      .from(l4_numbers)
      .where(
        and(
          eq(l4_numbers.buyer_id, input.buyer_id),
          gte(l4_numbers.rented_at, targetDate),
          lt(l4_numbers.rented_at, nextDate)
        )
      )
      .execute();

    // Calculate totals and convert numeric fields
    const total_numbers_rented = rentedNumbers.length;
    const total_amount = rentedNumbers.reduce((sum, number) => sum + parseFloat(number.price), 0);

    // Map the numbers with proper type conversions
    const numbers = rentedNumbers.map(number => ({
      id: number.id,
      phone_number: number.phone_number,
      country: number.country,
      type: number.type,
      price: parseFloat(number.price), // Convert numeric to number
      rented_at: number.rented_at!, // We know this is not null due to our query filter
      completed_at: number.completed_at
    }));

    return {
      buyer_id: input.buyer_id,
      buyer_name: buyer.name,
      date: input.date,
      total_numbers_rented,
      total_amount,
      numbers
    };
  } catch (error) {
    console.error('Daily invoice generation failed:', error);
    throw error;
  }
};