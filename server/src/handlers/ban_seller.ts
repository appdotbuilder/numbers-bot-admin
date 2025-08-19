import { type BanSellerInput, type Seller } from '../schema';

export const banSeller = async (input: BanSellerInput): Promise<Seller> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is banning a seller by updating their status to 'banned'
    // and optionally adding a status comment explaining the ban.
    return Promise.resolve({
        id: input.id,
        telegram_id: 'placeholder_telegram_id',
        status: 'banned' as const,
        status_comment: input.status_comment || 'Banned by administrator',
        permanent_rounding_bonus: 0,
        created_at: new Date(),
        updated_at: new Date()
    } as Seller);
};