import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_numbers, l4_buyers, l4_sellers } from '../db/schema';
import { type UpdateNumberStatusInput } from '../schema';
import { updateNumberStatus } from '../handlers/update_number_status';
import { eq } from 'drizzle-orm';

describe('updateNumberStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testBuyerId: number;
  let testSellerId: number;
  let testNumberId: number;

  beforeEach(async () => {
    // Create test buyer
    const buyerResult = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test_chat_123'
      })
      .returning()
      .execute();
    testBuyerId = buyerResult[0].id;

    // Create test seller
    const sellerResult = await db.insert(l4_sellers)
      .values({
        telegram_id: 'test_seller_123'
      })
      .returning()
      .execute();
    testSellerId = sellerResult[0].id;

    // Create test number
    const numberResult = await db.insert(l4_numbers)
      .values({
        phone_number: '+1234567890',
        country: 'US',
        type: 'mobile',
        status: 'available',
        price: '10.50'
      })
      .returning()
      .execute();
    testNumberId = numberResult[0].id;
  });

  it('should update number status from available to rented', async () => {
    const input: UpdateNumberStatusInput = {
      id: testNumberId,
      status: 'rented'
    };

    const result = await updateNumberStatus(input);

    expect(result.id).toEqual(testNumberId);
    expect(result.status).toEqual('rented');
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.country).toEqual('US');
    expect(result.type).toEqual('mobile');
    expect(result.price).toEqual(10.50);
    expect(typeof result.price).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should set completed_at when status changes to completed', async () => {
    const input: UpdateNumberStatusInput = {
      id: testNumberId,
      status: 'completed'
    };

    const result = await updateNumberStatus(input);

    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at).not.toBeNull();
  });

  it('should clear completed_at when status changes from completed to another status', async () => {
    // First set to completed
    await updateNumberStatus({
      id: testNumberId,
      status: 'completed'
    });

    // Then change to cancelled
    const result = await updateNumberStatus({
      id: testNumberId,
      status: 'cancelled'
    });

    expect(result.status).toEqual('cancelled');
    expect(result.completed_at).toBeNull();
  });

  it('should clear buyer assignment when status changes to returned_to_queue', async () => {
    // First assign to a buyer and rent it
    await db.update(l4_numbers)
      .set({
        buyer_id: testBuyerId,
        rented_at: new Date(),
        status: 'rented'
      })
      .where(eq(l4_numbers.id, testNumberId))
      .execute();

    const input: UpdateNumberStatusInput = {
      id: testNumberId,
      status: 'returned_to_queue'
    };

    const result = await updateNumberStatus(input);

    expect(result.status).toEqual('returned_to_queue');
    expect(result.buyer_id).toBeNull();
    expect(result.rented_at).toBeNull();
    expect(result.completed_at).toBeNull();
  });

  it('should clear buyer assignment when status changes to cancelled', async () => {
    // First assign to a buyer and rent it
    await db.update(l4_numbers)
      .set({
        buyer_id: testBuyerId,
        rented_at: new Date(),
        status: 'rented'
      })
      .where(eq(l4_numbers.id, testNumberId))
      .execute();

    const input: UpdateNumberStatusInput = {
      id: testNumberId,
      status: 'cancelled'
    };

    const result = await updateNumberStatus(input);

    expect(result.status).toEqual('cancelled');
    expect(result.buyer_id).toBeNull();
    expect(result.rented_at).toBeNull();
    expect(result.completed_at).toBeNull();
  });

  it('should preserve buyer assignment for accepted status', async () => {
    // First assign to a buyer and rent it
    await db.update(l4_numbers)
      .set({
        buyer_id: testBuyerId,
        rented_at: new Date(),
        status: 'rented'
      })
      .where(eq(l4_numbers.id, testNumberId))
      .execute();

    const input: UpdateNumberStatusInput = {
      id: testNumberId,
      status: 'accepted'
    };

    const result = await updateNumberStatus(input);

    expect(result.status).toEqual('accepted');
    expect(result.buyer_id).toEqual(testBuyerId);
    expect(result.rented_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should update database record correctly', async () => {
    const input: UpdateNumberStatusInput = {
      id: testNumberId,
      status: 'completed'
    };

    await updateNumberStatus(input);

    // Verify database was updated
    const numbers = await db.select()
      .from(l4_numbers)
      .where(eq(l4_numbers.id, testNumberId))
      .execute();

    expect(numbers).toHaveLength(1);
    expect(numbers[0].status).toEqual('completed');
    expect(numbers[0].completed_at).toBeInstanceOf(Date);
    expect(numbers[0].updated_at).toBeInstanceOf(Date);
    expect(parseFloat(numbers[0].price)).toEqual(10.50);
  });

  it('should throw error when number does not exist', async () => {
    const input: UpdateNumberStatusInput = {
      id: 99999, // Non-existent ID
      status: 'completed'
    };

    expect(() => updateNumberStatus(input)).toThrow(/Number with id 99999 not found/i);
  });

  it('should handle all valid status transitions', async () => {
    const statuses: Array<'available' | 'rented' | 'accepted' | 'completed' | 'cancelled' | 'returned_to_queue'> = [
      'available',
      'rented',
      'accepted',
      'completed',
      'cancelled',
      'returned_to_queue'
    ];

    for (const status of statuses) {
      const result = await updateNumberStatus({
        id: testNumberId,
        status: status
      });

      expect(result.status).toEqual(status);
      expect(result.updated_at).toBeInstanceOf(Date);
    }
  });
});