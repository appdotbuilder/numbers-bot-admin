import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { type UpdateSellerInput, type CreateSellerInput } from '../schema';
import { updateSeller } from '../handlers/update_seller';
import { eq } from 'drizzle-orm';

// Helper function to create a test seller
const createTestSeller = async (overrides: Partial<CreateSellerInput> = {}) => {
  const testSeller: CreateSellerInput = {
    telegram_id: 'test_telegram_123',
    status: 'active',
    status_comment: null,
    permanent_rounding_bonus: 5.50,
    ...overrides
  };

  const result = await db.insert(l4_sellers)
    .values({
      telegram_id: testSeller.telegram_id,
      status: testSeller.status,
      status_comment: testSeller.status_comment,
      permanent_rounding_bonus: testSeller.permanent_rounding_bonus.toString()
    })
    .returning()
    .execute();

  return {
    ...result[0],
    permanent_rounding_bonus: parseFloat(result[0].permanent_rounding_bonus)
  };
};

describe('updateSeller', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update seller status', async () => {
    const testSeller = await createTestSeller();

    const updateInput: UpdateSellerInput = {
      id: testSeller.id,
      status: 'inactive'
    };

    const result = await updateSeller(updateInput);

    expect(result.id).toEqual(testSeller.id);
    expect(result.status).toEqual('inactive');
    expect(result.telegram_id).toEqual(testSeller.telegram_id);
    expect(result.permanent_rounding_bonus).toEqual(testSeller.permanent_rounding_bonus);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testSeller.updated_at.getTime());
  });

  it('should update seller status comment', async () => {
    const testSeller = await createTestSeller();

    const updateInput: UpdateSellerInput = {
      id: testSeller.id,
      status_comment: 'Temporarily inactive for maintenance'
    };

    const result = await updateSeller(updateInput);

    expect(result.id).toEqual(testSeller.id);
    expect(result.status_comment).toEqual('Temporarily inactive for maintenance');
    expect(result.status).toEqual(testSeller.status);
  });

  it('should update permanent rounding bonus', async () => {
    const testSeller = await createTestSeller();

    const updateInput: UpdateSellerInput = {
      id: testSeller.id,
      permanent_rounding_bonus: 12.75
    };

    const result = await updateSeller(updateInput);

    expect(result.id).toEqual(testSeller.id);
    expect(result.permanent_rounding_bonus).toEqual(12.75);
    expect(typeof result.permanent_rounding_bonus).toBe('number');
  });

  it('should update multiple fields at once', async () => {
    const testSeller = await createTestSeller();

    const updateInput: UpdateSellerInput = {
      id: testSeller.id,
      status: 'banned',
      status_comment: 'Violated terms of service',
      permanent_rounding_bonus: 0
    };

    const result = await updateSeller(updateInput);

    expect(result.id).toEqual(testSeller.id);
    expect(result.status).toEqual('banned');
    expect(result.status_comment).toEqual('Violated terms of service');
    expect(result.permanent_rounding_bonus).toEqual(0);
    expect(result.telegram_id).toEqual(testSeller.telegram_id);
  });

  it('should set status_comment to null', async () => {
    const testSeller = await createTestSeller({
      status_comment: 'Previous comment'
    });

    const updateInput: UpdateSellerInput = {
      id: testSeller.id,
      status_comment: null
    };

    const result = await updateSeller(updateInput);

    expect(result.id).toEqual(testSeller.id);
    expect(result.status_comment).toBeNull();
  });

  it('should save changes to database', async () => {
    const testSeller = await createTestSeller();

    const updateInput: UpdateSellerInput = {
      id: testSeller.id,
      status: 'inactive',
      permanent_rounding_bonus: 8.25
    };

    await updateSeller(updateInput);

    // Verify the changes were saved to the database
    const sellers = await db.select()
      .from(l4_sellers)
      .where(eq(l4_sellers.id, testSeller.id))
      .execute();

    expect(sellers).toHaveLength(1);
    expect(sellers[0].status).toEqual('inactive');
    expect(parseFloat(sellers[0].permanent_rounding_bonus)).toEqual(8.25);
    expect(sellers[0].telegram_id).toEqual(testSeller.telegram_id);
  });

  it('should throw error for non-existent seller', async () => {
    const updateInput: UpdateSellerInput = {
      id: 99999,
      status: 'inactive'
    };

    await expect(updateSeller(updateInput)).rejects.toThrow(/Seller with id 99999 not found/i);
  });

  it('should handle zero permanent_rounding_bonus', async () => {
    const testSeller = await createTestSeller({ permanent_rounding_bonus: 10 });

    const updateInput: UpdateSellerInput = {
      id: testSeller.id,
      permanent_rounding_bonus: 0
    };

    const result = await updateSeller(updateInput);

    expect(result.permanent_rounding_bonus).toEqual(0);
    expect(typeof result.permanent_rounding_bonus).toBe('number');
  });

  it('should handle partial updates without affecting other fields', async () => {
    const testSeller = await createTestSeller({
      status: 'active',
      status_comment: 'Initial comment',
      permanent_rounding_bonus: 15.50
    });

    // Update only status
    const updateInput: UpdateSellerInput = {
      id: testSeller.id,
      status: 'banned'
    };

    const result = await updateSeller(updateInput);

    expect(result.status).toEqual('banned');
    expect(result.status_comment).toEqual('Initial comment'); // Should remain unchanged
    expect(result.permanent_rounding_bonus).toEqual(15.50); // Should remain unchanged
    expect(result.telegram_id).toEqual(testSeller.telegram_id); // Should remain unchanged
  });
});