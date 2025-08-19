import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers, l4_sellers, l4_numbers } from '../db/schema';
import { type StopworkBuyerInput } from '../schema';
import { stopworkBuyer } from '../handlers/stopwork_buyer';
import { eq, and } from 'drizzle-orm';

// Test input
const testInput: StopworkBuyerInput = {
  id: 1
};

describe('stopworkBuyer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should stop work for buyer and move accepted numbers to queue', async () => {
    // Create test buyer
    const buyerResult = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'auto',
        chat_id: 'test_chat_123',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    const buyerId = buyerResult[0].id;

    // Create test seller
    const sellerResult = await db.insert(l4_sellers)
      .values({
        telegram_id: 'seller_123',
        status: 'active',
        permanent_rounding_bonus: '0'
      })
      .returning()
      .execute();

    const sellerId = sellerResult[0].id;

    // Create accepted numbers for the buyer
    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1234567890',
          country: 'US',
          type: 'SMS',
          status: 'accepted',
          buyer_id: buyerId,
          seller_id: sellerId,
          price: '5.99',
          rented_at: new Date(),
        },
        {
          phone_number: '+1234567891',
          country: 'US',
          type: 'SMS',
          status: 'accepted',
          buyer_id: buyerId,
          seller_id: sellerId,
          price: '5.99',
          rented_at: new Date(),
        }
      ])
      .execute();

    const result = await stopworkBuyer({ id: buyerId });

    // Verify response
    expect(result.success).toBe(true);
    expect(result.message).toContain('2 accepted numbers moved to queue');
    expect(result.message).toContain(`buyer ${buyerId}`);

    // Verify numbers were moved to returned_to_queue
    const updatedNumbers = await db.select()
      .from(l4_numbers)
      .where(eq(l4_numbers.phone_number, '+1234567890'))
      .execute();

    expect(updatedNumbers[0].status).toBe('returned_to_queue');
    expect(updatedNumbers[0].buyer_id).toBe(null);

    // Verify buyer was banned
    const updatedBuyer = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, buyerId))
      .execute();

    expect(updatedBuyer[0].is_banned).toBe(true);
    expect(updatedBuyer[0].ban_reason).toContain('Stopwork applied');
  });

  it('should ban buyer even when no accepted numbers exist', async () => {
    // Create test buyer
    const buyerResult = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer No Numbers',
        mode: 'manual',
        chat_id: 'test_chat_456',
        max_numbers_per_branch: 5
      })
      .returning()
      .execute();

    const buyerId = buyerResult[0].id;

    const result = await stopworkBuyer({ id: buyerId });

    // Verify response
    expect(result.success).toBe(true);
    expect(result.message).toContain('No accepted numbers found');
    expect(result.message).toContain('buyer banned to prevent future rentals');

    // Verify buyer was banned
    const updatedBuyer = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, buyerId))
      .execute();

    expect(updatedBuyer[0].is_banned).toBe(true);
    expect(updatedBuyer[0].ban_reason).toContain('Stopwork applied');
  });

  it('should not affect numbers with other statuses', async () => {
    // Create test buyer
    const buyerResult = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer Mixed',
        mode: 'auto',
        chat_id: 'test_chat_789',
        max_numbers_per_branch: 15
      })
      .returning()
      .execute();

    const buyerId = buyerResult[0].id;

    // Create test seller
    const sellerResult = await db.insert(l4_sellers)
      .values({
        telegram_id: 'seller_456',
        status: 'active',
        permanent_rounding_bonus: '0'
      })
      .returning()
      .execute();

    const sellerId = sellerResult[0].id;

    // Create numbers with different statuses
    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1234567892',
          country: 'CA',
          type: 'Voice',
          status: 'accepted',
          buyer_id: buyerId,
          seller_id: sellerId,
          price: '7.99',
          rented_at: new Date(),
        },
        {
          phone_number: '+1234567893',
          country: 'CA',
          type: 'SMS',
          status: 'completed',
          buyer_id: buyerId,
          seller_id: sellerId,
          price: '6.99',
          rented_at: new Date(),
          completed_at: new Date(),
        },
        {
          phone_number: '+1234567894',
          country: 'UK',
          type: 'SMS',
          status: 'rented',
          buyer_id: buyerId,
          seller_id: sellerId,
          price: '4.99',
          rented_at: new Date(),
        }
      ])
      .execute();

    const result = await stopworkBuyer({ id: buyerId });

    expect(result.success).toBe(true);
    expect(result.message).toContain('1 accepted numbers moved to queue');

    // Verify only accepted number was affected
    const acceptedNumber = await db.select()
      .from(l4_numbers)
      .where(eq(l4_numbers.phone_number, '+1234567892'))
      .execute();
    expect(acceptedNumber[0].status).toBe('returned_to_queue');
    expect(acceptedNumber[0].buyer_id).toBe(null);

    // Verify completed number was not affected
    const completedNumber = await db.select()
      .from(l4_numbers)
      .where(eq(l4_numbers.phone_number, '+1234567893'))
      .execute();
    expect(completedNumber[0].status).toBe('completed');
    expect(completedNumber[0].buyer_id).toBe(buyerId);

    // Verify rented number was not affected
    const rentedNumber = await db.select()
      .from(l4_numbers)
      .where(eq(l4_numbers.phone_number, '+1234567894'))
      .execute();
    expect(rentedNumber[0].status).toBe('rented');
    expect(rentedNumber[0].buyer_id).toBe(buyerId);
  });

  it('should return error when buyer does not exist', async () => {
    const result = await stopworkBuyer({ id: 999 });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Buyer with ID 999 not found');
  });

  it('should return error when buyer is already banned', async () => {
    // Create already banned buyer
    const buyerResult = await db.insert(l4_buyers)
      .values({
        name: 'Banned Buyer',
        mode: 'manual',
        chat_id: 'banned_chat_123',
        is_banned: true,
        ban_reason: 'Previous violation',
        max_numbers_per_branch: 5
      })
      .returning()
      .execute();

    const buyerId = buyerResult[0].id;

    const result = await stopworkBuyer({ id: buyerId });

    expect(result.success).toBe(false);
    expect(result.message).toContain('already banned');
    expect(result.message).toContain('cannot have stopwork applied');
  });

  it('should only affect numbers belonging to the specified buyer', async () => {
    // Create two buyers
    const buyer1Result = await db.insert(l4_buyers)
      .values({
        name: 'Buyer 1',
        mode: 'auto',
        chat_id: 'buyer1_chat',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    const buyer2Result = await db.insert(l4_buyers)
      .values({
        name: 'Buyer 2',
        mode: 'auto',
        chat_id: 'buyer2_chat',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    const buyer1Id = buyer1Result[0].id;
    const buyer2Id = buyer2Result[0].id;

    // Create test seller
    const sellerResult = await db.insert(l4_sellers)
      .values({
        telegram_id: 'seller_isolation',
        status: 'active',
        permanent_rounding_bonus: '0'
      })
      .returning()
      .execute();

    const sellerId = sellerResult[0].id;

    // Create accepted numbers for both buyers
    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1111111111',
          country: 'US',
          type: 'SMS',
          status: 'accepted',
          buyer_id: buyer1Id,
          seller_id: sellerId,
          price: '5.99',
          rented_at: new Date(),
        },
        {
          phone_number: '+2222222222',
          country: 'US',
          type: 'SMS',
          status: 'accepted',
          buyer_id: buyer2Id,
          seller_id: sellerId,
          price: '5.99',
          rented_at: new Date(),
        }
      ])
      .execute();

    // Apply stopwork only to buyer1
    const result = await stopworkBuyer({ id: buyer1Id });

    expect(result.success).toBe(true);

    // Verify buyer1's number was affected
    const buyer1Number = await db.select()
      .from(l4_numbers)
      .where(eq(l4_numbers.phone_number, '+1111111111'))
      .execute();
    expect(buyer1Number[0].status).toBe('returned_to_queue');
    expect(buyer1Number[0].buyer_id).toBe(null);

    // Verify buyer2's number was NOT affected
    const buyer2Number = await db.select()
      .from(l4_numbers)
      .where(eq(l4_numbers.phone_number, '+2222222222'))
      .execute();
    expect(buyer2Number[0].status).toBe('accepted');
    expect(buyer2Number[0].buyer_id).toBe(buyer2Id);

    // Verify buyer1 was banned but buyer2 was not
    const updatedBuyer1 = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, buyer1Id))
      .execute();
    expect(updatedBuyer1[0].is_banned).toBe(true);

    const updatedBuyer2 = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, buyer2Id))
      .execute();
    expect(updatedBuyer2[0].is_banned).toBe(false);
  });
});