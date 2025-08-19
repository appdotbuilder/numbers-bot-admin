import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { type CreateBuyerInput } from '../schema';
import { createBuyer } from '../handlers/create_buyer';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateBuyerInput = {
  name: 'Test Buyer',
  mode: 'premium',
  chat_id: 'test_chat_123',
  max_numbers_per_branch: 15
};

// Minimal test input using defaults
const minimalInput: CreateBuyerInput = {
  name: 'Minimal Buyer',
  mode: 'basic',
  chat_id: 'minimal_chat_456',
  max_numbers_per_branch: 10 // Default value
};

describe('createBuyer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a buyer with all fields', async () => {
    const result = await createBuyer(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Buyer');
    expect(result.mode).toEqual('premium');
    expect(result.chat_id).toEqual('test_chat_123');
    expect(result.max_numbers_per_branch).toEqual(15);
    expect(result.is_banned).toEqual(false);
    expect(result.ban_reason).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a buyer with default max_numbers_per_branch', async () => {
    const result = await createBuyer(minimalInput);

    expect(result.name).toEqual('Minimal Buyer');
    expect(result.mode).toEqual('basic');
    expect(result.chat_id).toEqual('minimal_chat_456');
    expect(result.max_numbers_per_branch).toEqual(10);
    expect(result.is_banned).toEqual(false);
    expect(result.ban_reason).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save buyer to database', async () => {
    const result = await createBuyer(testInput);

    // Query using proper drizzle syntax
    const buyers = await db.select()
      .from(l4_buyers)
      .where(eq(l4_buyers.id, result.id))
      .execute();

    expect(buyers).toHaveLength(1);
    expect(buyers[0].name).toEqual('Test Buyer');
    expect(buyers[0].mode).toEqual('premium');
    expect(buyers[0].chat_id).toEqual('test_chat_123');
    expect(buyers[0].max_numbers_per_branch).toEqual(15);
    expect(buyers[0].is_banned).toEqual(false);
    expect(buyers[0].ban_reason).toBeNull();
    expect(buyers[0].created_at).toBeInstanceOf(Date);
    expect(buyers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique chat_id constraint', async () => {
    // Create first buyer
    await createBuyer(testInput);

    // Try to create another buyer with same chat_id
    const duplicateInput: CreateBuyerInput = {
      name: 'Duplicate Buyer',
      mode: 'standard',
      chat_id: 'test_chat_123', // Same chat_id
      max_numbers_per_branch: 5
    };

    await expect(createBuyer(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should create multiple buyers with different chat_ids', async () => {
    const buyer1 = await createBuyer(testInput);
    const buyer2 = await createBuyer(minimalInput);

    expect(buyer1.id).not.toEqual(buyer2.id);
    expect(buyer1.chat_id).not.toEqual(buyer2.chat_id);

    // Verify both exist in database
    const allBuyers = await db.select()
      .from(l4_buyers)
      .execute();

    expect(allBuyers).toHaveLength(2);
    
    const chatIds = allBuyers.map(buyer => buyer.chat_id);
    expect(chatIds).toContain('test_chat_123');
    expect(chatIds).toContain('minimal_chat_456');
  });

  it('should handle special characters in name and mode', async () => {
    const specialInput: CreateBuyerInput = {
      name: 'Büyer with Spëcial Chärs & Symbols!',
      mode: 'ultra-premium_v2.0',
      chat_id: 'special_chat_789',
      max_numbers_per_branch: 25
    };

    const result = await createBuyer(specialInput);

    expect(result.name).toEqual('Büyer with Spëcial Chärs & Symbols!');
    expect(result.mode).toEqual('ultra-premium_v2.0');
    expect(result.chat_id).toEqual('special_chat_789');
    expect(result.max_numbers_per_branch).toEqual(25);
  });

  it('should set correct timestamps', async () => {
    const beforeCreation = new Date();
    const result = await createBuyer(testInput);
    const afterCreation = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());

    // created_at and updated_at should be very close (within same transaction)
    const timeDiff = Math.abs(result.updated_at.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000); // Within 1 second
  });
});