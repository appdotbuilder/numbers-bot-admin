import { type CreateSellerInput, type Seller } from '../schema';

export const createSeller = async (input: CreateSellerInput): Promise<Seller> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new seller and persisting it in the database.
    return Promise.resolve({
        id: 0, // Placeholder ID
        telegram_id: input.telegram_id,
        status: input.status || 'active',
        status_comment: input.status_comment || null,
        permanent_rounding_bonus: input.permanent_rounding_bonus || 0,
        created_at: new Date(),
        updated_at: new Date()
    } as Seller);
};