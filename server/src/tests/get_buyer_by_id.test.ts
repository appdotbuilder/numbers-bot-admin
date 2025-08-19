import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { getBuyerById } from '../handlers/get_buyer_by_id';

describe('getBuyerById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return buyer when found', async () => {
    // Create a test buyer
    const [createdBuyer] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'premium',
        chat_id: 'test_chat_123',
        max_numbers_per_branch: 15,
        is_banned: false
      })
      .returning()
      .execute();

    const result = await getBuyerById(createdBuyer.id);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(createdBuyer.id);
    expect(result?.name).toEqual('Test Buyer');
    expect(result?.mode).toEqual('premium');
    expect(result?.chat_id).toEqual('test_chat_123');
    expect(result?.max_numbers_per_branch).toEqual(15);
    expect(result?.is_banned).toEqual(false);
    expect(result?.ban_reason).toBeNull();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when buyer not found', async () => {
    const result = await getBuyerById(99999);
    expect(result).toBeNull();
  });

  it('should return buyer with ban details when banned', async () => {
    // Create a banned buyer
    const [createdBuyer] = await db.insert(l4_buyers)
      .values({
        name: 'Banned Buyer',
        mode: 'basic',
        chat_id: 'banned_chat_456',
        max_numbers_per_branch: 5,
        is_banned: true,
        ban_reason: 'Violated terms of service'
      })
      .returning()
      .execute();

    const result = await getBuyerById(createdBuyer.id);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(createdBuyer.id);
    expect(result?.name).toEqual('Banned Buyer');
    expect(result?.is_banned).toEqual(true);
    expect(result?.ban_reason).toEqual('Violated terms of service');
    expect(result?.max_numbers_per_branch).toEqual(5);
  });

  it('should handle buyers with various max_numbers_per_branch values', async () => {
    // Create buyer with custom max numbers per branch
    const [createdBuyer] = await db.insert(l4_buyers)
      .values({
        name: 'Custom Limits Buyer',
        mode: 'enterprise',
        chat_id: 'enterprise_chat_789',
        max_numbers_per_branch: 50,
        is_banned: false
      })
      .returning()
      .execute();

    const result = await getBuyerById(createdBuyer.id);

    expect(result).toBeDefined();
    expect(result?.max_numbers_per_branch).toEqual(50);
    expect(typeof result?.max_numbers_per_branch).toEqual('number');
  });

  it('should return correct timestamps', async () => {
    const beforeCreation = new Date();
    
    const [createdBuyer] = await db.insert(l4_buyers)
      .values({
        name: 'Timestamp Test Buyer',
        mode: 'basic',
        chat_id: 'timestamp_chat_321',
        max_numbers_per_branch: 10,
        is_banned: false
      })
      .returning()
      .execute();

    const afterCreation = new Date();
    const result = await getBuyerById(createdBuyer.id);

    expect(result).toBeDefined();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
    
    // Additional null checks for TypeScript
    expect(result).not.toBeNull();
    if (result) {
      expect(result.created_at >= beforeCreation).toBe(true);
      expect(result.created_at <= afterCreation).toBe(true);
      expect(result.updated_at >= beforeCreation).toBe(true);
      expect(result.updated_at <= afterCreation).toBe(true);
    }
  });
});