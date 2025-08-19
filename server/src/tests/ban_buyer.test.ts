import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { type BanBuyerInput } from '../schema';
import { banBuyer } from '../handlers/ban_buyer';
import { eq } from 'drizzle-orm';

// Create test buyer data first
const createTestBuyer = async () => {
  const result = await db.insert(l4_buyers)
    .values({
      name: 'Test Buyer',
      mode: 'test_mode',
      chat_id: 'test_chat_123',
      max_numbers_per_branch: 15,
      is_banned: false,
      ban_reason: null
    })
    .returning()
    .execute();
  
  return result[0];
};

// Test input
const testBanInput: BanBuyerInput = {
  id: 0, // Will be set dynamically in tests
  ban_reason: 'Violation of terms of service'
};

describe('banBuyer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should ban a buyer successfully', async () => {
    // Create a test buyer first
    const testBuyer = await createTestBuyer();
    const banInput = { ...testBanInput, id: testBuyer.id };

    const result = await banBuyer(banInput);

    // Basic field validation
    expect(result.id).toEqual(testBuyer.id);
    expect(result.name).toEqual('Test Buyer');
    expect(result.is_banned).toBe(true);
    expect(result.ban_reason).toEqual('Violation of terms of service');
    expect(result.mode).toEqual('test_mode');
    expect(result.chat_id).toEqual('test_chat_123');
    expect(result.max_numbers_per_branch).toEqual(15);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save banned status to database', async () => {
    // Create a test buyer first
    const testBuyer = await createTestBuyer();
    const banInput = { ...testBanInput, id: testBuyer.id };

    const result = await banBuyer(banInput);

    // Query database to verify the ban was applied
    const buyers = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, result.id))
      .execute();

    expect(buyers).toHaveLength(1);
    expect(buyers[0].is_banned).toBe(true);
    expect(buyers[0].ban_reason).toEqual('Violation of terms of service');
    expect(buyers[0].updated_at).toBeInstanceOf(Date);
    // Verify other fields remain unchanged
    expect(buyers[0].name).toEqual('Test Buyer');
    expect(buyers[0].mode).toEqual('test_mode');
    expect(buyers[0].chat_id).toEqual('test_chat_123');
  });

  it('should update already banned buyer with new ban reason', async () => {
    // Create and ban a buyer first
    const testBuyer = await createTestBuyer();
    const firstBanInput = { ...testBanInput, id: testBuyer.id };
    await banBuyer(firstBanInput);

    // Ban again with different reason
    const secondBanInput = {
      id: testBuyer.id,
      ban_reason: 'Fraudulent activity detected'
    };

    const result = await banBuyer(secondBanInput);

    // Verify updated ban reason
    expect(result.is_banned).toBe(true);
    expect(result.ban_reason).toEqual('Fraudulent activity detected');

    // Verify in database
    const buyers = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, result.id))
      .execute();

    expect(buyers[0].ban_reason).toEqual('Fraudulent activity detected');
  });

  it('should throw error for non-existent buyer', async () => {
    const nonExistentBanInput = {
      id: 99999,
      ban_reason: 'Test ban reason'
    };

    await expect(banBuyer(nonExistentBanInput)).rejects.toThrow(/not found/i);
  });

  it('should handle empty ban reason correctly', async () => {
    // Create a test buyer first
    const testBuyer = await createTestBuyer();
    const banInput = {
      id: testBuyer.id,
      ban_reason: ''
    };

    // This should work since the schema requires min(1) but the handler accepts what's provided
    // The validation happens at the schema level, not in the handler
    const result = await banBuyer(banInput);

    expect(result.is_banned).toBe(true);
    expect(result.ban_reason).toEqual('');
  });

  it('should preserve original created_at timestamp', async () => {
    // Create a test buyer first
    const testBuyer = await createTestBuyer();
    const originalCreatedAt = testBuyer.created_at;
    
    // Wait a small amount to ensure timestamps would be different
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const banInput = { ...testBanInput, id: testBuyer.id };
    const result = await banBuyer(banInput);

    // Verify created_at was not modified, but updated_at was changed
    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
  });
});