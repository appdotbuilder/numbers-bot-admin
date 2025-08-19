import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { type CreateBuyerInput } from '../schema';
import { unbanBuyer } from '../handlers/unban_buyer';
import { eq } from 'drizzle-orm';

// Test buyer data
const testBuyerInput: CreateBuyerInput = {
  name: 'Test Buyer',
  mode: 'default',
  chat_id: 'test_chat_123',
  max_numbers_per_branch: 5
};

describe('unbanBuyer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should unban a banned buyer', async () => {
    // Create a banned buyer first
    const createdBuyerResult = await db.insert(l4_buyers)
      .values({
        ...testBuyerInput,
        is_banned: true,
        ban_reason: 'Test ban reason'
      })
      .returning()
      .execute();

    const createdBuyer = createdBuyerResult[0];
    
    // Unban the buyer
    const result = await unbanBuyer(createdBuyer.id);

    // Verify the returned buyer is unbanned
    expect(result.id).toEqual(createdBuyer.id);
    expect(result.name).toEqual('Test Buyer');
    expect(result.is_banned).toEqual(false);
    expect(result.ban_reason).toBeNull();
    expect(result.mode).toEqual('default');
    expect(result.chat_id).toEqual('test_chat_123');
    expect(result.max_numbers_per_branch).toEqual(5);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should save unban changes to database', async () => {
    // Create a banned buyer first
    const createdBuyerResult = await db.insert(l4_buyers)
      .values({
        ...testBuyerInput,
        is_banned: true,
        ban_reason: 'Another test ban reason'
      })
      .returning()
      .execute();

    const createdBuyer = createdBuyerResult[0];
    
    // Unban the buyer
    await unbanBuyer(createdBuyer.id);

    // Query the database to verify changes were persisted
    const buyers = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, createdBuyer.id))
      .execute();

    expect(buyers).toHaveLength(1);
    expect(buyers[0].is_banned).toEqual(false);
    expect(buyers[0].ban_reason).toBeNull();
    expect(buyers[0].name).toEqual('Test Buyer');
    expect(buyers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should unban a buyer that is already unbanned', async () => {
    // Create an unbanned buyer
    const createdBuyerResult = await db.insert(l4_buyers)
      .values({
        ...testBuyerInput,
        is_banned: false,
        ban_reason: null
      })
      .returning()
      .execute();

    const createdBuyer = createdBuyerResult[0];
    
    // Unban the already unbanned buyer (should work without issues)
    const result = await unbanBuyer(createdBuyer.id);

    expect(result.is_banned).toEqual(false);
    expect(result.ban_reason).toBeNull();
    expect(result.id).toEqual(createdBuyer.id);
  });

  it('should throw error for non-existent buyer', async () => {
    const nonExistentBuyerId = 99999;

    await expect(unbanBuyer(nonExistentBuyerId)).rejects.toThrow(/Buyer with id 99999 not found/i);
  });

  it('should update timestamp when unbanning', async () => {
    // Create a banned buyer
    const createdBuyerResult = await db.insert(l4_buyers)
      .values({
        ...testBuyerInput,
        is_banned: true,
        ban_reason: 'Timestamp test ban'
      })
      .returning()
      .execute();

    const createdBuyer = createdBuyerResult[0];
    const originalUpdatedAt = createdBuyer.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Unban the buyer
    const result = await unbanBuyer(createdBuyer.id);

    // Verify updated_at was changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});