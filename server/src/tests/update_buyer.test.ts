import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateBuyerInput } from '../schema';
import { updateBuyer } from '../handlers/update_buyer';

describe('updateBuyer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create a test buyer for update operations
  const createTestBuyer = async () => {
    const result = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test_mode',
        chat_id: 'test_chat_123',
        max_numbers_per_branch: 5
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should update buyer name', async () => {
    const testBuyer = await createTestBuyer();
    
    const updateInput: UpdateBuyerInput = {
      id: testBuyer.id,
      name: 'Updated Buyer Name'
    };

    const result = await updateBuyer(updateInput);

    expect(result.id).toEqual(testBuyer.id);
    expect(result.name).toEqual('Updated Buyer Name');
    expect(result.mode).toEqual(testBuyer.mode); // Should remain unchanged
    expect(result.chat_id).toEqual(testBuyer.chat_id);
    expect(result.max_numbers_per_branch).toEqual(testBuyer.max_numbers_per_branch);
    expect(result.is_banned).toEqual(false);
    expect(result.ban_reason).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testBuyer.updated_at.getTime());
  });

  it('should update buyer mode', async () => {
    const testBuyer = await createTestBuyer();
    
    const updateInput: UpdateBuyerInput = {
      id: testBuyer.id,
      mode: 'updated_mode'
    };

    const result = await updateBuyer(updateInput);

    expect(result.id).toEqual(testBuyer.id);
    expect(result.name).toEqual(testBuyer.name); // Should remain unchanged
    expect(result.mode).toEqual('updated_mode');
    expect(result.chat_id).toEqual(testBuyer.chat_id);
    expect(result.max_numbers_per_branch).toEqual(testBuyer.max_numbers_per_branch);
  });

  it('should update max_numbers_per_branch', async () => {
    const testBuyer = await createTestBuyer();
    
    const updateInput: UpdateBuyerInput = {
      id: testBuyer.id,
      max_numbers_per_branch: 25
    };

    const result = await updateBuyer(updateInput);

    expect(result.id).toEqual(testBuyer.id);
    expect(result.name).toEqual(testBuyer.name); // Should remain unchanged
    expect(result.mode).toEqual(testBuyer.mode); // Should remain unchanged
    expect(result.max_numbers_per_branch).toEqual(25);
  });

  it('should update multiple fields at once', async () => {
    const testBuyer = await createTestBuyer();
    
    const updateInput: UpdateBuyerInput = {
      id: testBuyer.id,
      name: 'Multi Update Buyer',
      mode: 'multi_mode',
      max_numbers_per_branch: 15
    };

    const result = await updateBuyer(updateInput);

    expect(result.id).toEqual(testBuyer.id);
    expect(result.name).toEqual('Multi Update Buyer');
    expect(result.mode).toEqual('multi_mode');
    expect(result.max_numbers_per_branch).toEqual(15);
    expect(result.chat_id).toEqual(testBuyer.chat_id); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated buyer to database', async () => {
    const testBuyer = await createTestBuyer();
    
    const updateInput: UpdateBuyerInput = {
      id: testBuyer.id,
      name: 'Database Updated Name',
      max_numbers_per_branch: 30
    };

    await updateBuyer(updateInput);

    // Verify the update was persisted in the database
    const buyers = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, testBuyer.id))
      .execute();

    expect(buyers).toHaveLength(1);
    expect(buyers[0].name).toEqual('Database Updated Name');
    expect(buyers[0].max_numbers_per_branch).toEqual(30);
    expect(buyers[0].mode).toEqual(testBuyer.mode); // Should remain unchanged
    expect(buyers[0].updated_at).toBeInstanceOf(Date);
    expect(buyers[0].updated_at.getTime()).toBeGreaterThan(testBuyer.updated_at.getTime());
  });

  it('should throw error when buyer does not exist', async () => {
    const updateInput: UpdateBuyerInput = {
      id: 999999, // Non-existent buyer ID
      name: 'Non-existent Buyer'
    };

    await expect(updateBuyer(updateInput))
      .rejects
      .toThrow(/buyer with id 999999 not found/i);
  });

  it('should handle update with no optional fields provided', async () => {
    const testBuyer = await createTestBuyer();
    
    const updateInput: UpdateBuyerInput = {
      id: testBuyer.id
      // No optional fields provided
    };

    const result = await updateBuyer(updateInput);

    // Should return the buyer with only updated_at changed
    expect(result.id).toEqual(testBuyer.id);
    expect(result.name).toEqual(testBuyer.name);
    expect(result.mode).toEqual(testBuyer.mode);
    expect(result.max_numbers_per_branch).toEqual(testBuyer.max_numbers_per_branch);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testBuyer.updated_at.getTime());
  });
});