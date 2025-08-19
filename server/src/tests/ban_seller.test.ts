import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { type BanSellerInput, type CreateSellerInput } from '../schema';
import { banSeller } from '../handlers/ban_seller';
import { eq } from 'drizzle-orm';

// Test input for creating a seller first
const testCreateInput: CreateSellerInput = {
  telegram_id: 'test_telegram_123',
  status: 'active',
  status_comment: null,
  permanent_rounding_bonus: 5.50
};

// Simple test input for banning
const testBanInput: BanSellerInput = {
  id: 1, // Will be set dynamically after creating seller
  status_comment: 'Violated terms of service'
};

describe('banSeller', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should ban a seller with custom status comment', async () => {
    // Create a seller first
    const createResult = await db.insert(l4_sellers)
      .values({
        telegram_id: testCreateInput.telegram_id,
        status: testCreateInput.status,
        status_comment: testCreateInput.status_comment,
        permanent_rounding_bonus: testCreateInput.permanent_rounding_bonus.toString()
      })
      .returning()
      .execute();

    const createdSeller = createResult[0];
    
    // Ban the seller
    const banInput: BanSellerInput = {
      id: createdSeller.id,
      status_comment: 'Violated terms of service'
    };

    const result = await banSeller(banInput);

    // Basic field validation
    expect(result.id).toEqual(createdSeller.id);
    expect(result.telegram_id).toEqual(testCreateInput.telegram_id);
    expect(result.status).toEqual('banned');
    expect(result.status_comment).toEqual('Violated terms of service');
    expect(result.permanent_rounding_bonus).toEqual(5.50);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should ban a seller with default status comment when none provided', async () => {
    // Create a seller first
    const createResult = await db.insert(l4_sellers)
      .values({
        telegram_id: testCreateInput.telegram_id,
        status: testCreateInput.status,
        status_comment: testCreateInput.status_comment,
        permanent_rounding_bonus: testCreateInput.permanent_rounding_bonus.toString()
      })
      .returning()
      .execute();

    const createdSeller = createResult[0];
    
    // Ban the seller without status comment
    const banInput: BanSellerInput = {
      id: createdSeller.id
    };

    const result = await banSeller(banInput);

    expect(result.status).toEqual('banned');
    expect(result.status_comment).toEqual('Banned by administrator');
    expect(result.telegram_id).toEqual(testCreateInput.telegram_id);
  });

  it('should save banned seller status to database', async () => {
    // Create a seller first
    const createResult = await db.insert(l4_sellers)
      .values({
        telegram_id: testCreateInput.telegram_id,
        status: testCreateInput.status,
        status_comment: testCreateInput.status_comment,
        permanent_rounding_bonus: testCreateInput.permanent_rounding_bonus.toString()
      })
      .returning()
      .execute();

    const createdSeller = createResult[0];
    
    const banInput: BanSellerInput = {
      id: createdSeller.id,
      status_comment: 'Policy violation'
    };

    const result = await banSeller(banInput);

    // Query database to verify the change was persisted
    const sellers = await db.select()
      .from(l4_sellers)
      .where(eq(l4_sellers.id, result.id))
      .execute();

    expect(sellers).toHaveLength(1);
    expect(sellers[0].status).toEqual('banned');
    expect(sellers[0].status_comment).toEqual('Policy violation');
    expect(sellers[0].telegram_id).toEqual(testCreateInput.telegram_id);
    expect(parseFloat(sellers[0].permanent_rounding_bonus)).toEqual(5.50);
    expect(sellers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update timestamps when banning seller', async () => {
    // Create a seller first
    const createResult = await db.insert(l4_sellers)
      .values({
        telegram_id: testCreateInput.telegram_id,
        status: testCreateInput.status,
        status_comment: testCreateInput.status_comment,
        permanent_rounding_bonus: testCreateInput.permanent_rounding_bonus.toString()
      })
      .returning()
      .execute();

    const createdSeller = createResult[0];
    const originalUpdatedAt = createdSeller.updated_at;

    // Wait a small moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const banInput: BanSellerInput = {
      id: createdSeller.id,
      status_comment: 'Banned for testing'
    };

    const result = await banSeller(banInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    expect(result.created_at).toEqual(createdSeller.created_at);
  });

  it('should throw error when seller not found', async () => {
    const nonExistentBanInput: BanSellerInput = {
      id: 99999,
      status_comment: 'This seller does not exist'
    };

    await expect(banSeller(nonExistentBanInput)).rejects.toThrow(/Seller with id 99999 not found/i);
  });

  it('should ban seller that is currently inactive', async () => {
    // Create an inactive seller
    const createResult = await db.insert(l4_sellers)
      .values({
        telegram_id: 'inactive_seller_456',
        status: 'inactive',
        status_comment: 'Temporarily inactive',
        permanent_rounding_bonus: '2.25'
      })
      .returning()
      .execute();

    const createdSeller = createResult[0];
    
    const banInput: BanSellerInput = {
      id: createdSeller.id,
      status_comment: 'Permanent ban after review'
    };

    const result = await banSeller(banInput);

    expect(result.status).toEqual('banned');
    expect(result.status_comment).toEqual('Permanent ban after review');
    expect(result.permanent_rounding_bonus).toEqual(2.25);
  });

  it('should handle numeric field conversion correctly', async () => {
    // Create seller with large permanent rounding bonus
    const createResult = await db.insert(l4_sellers)
      .values({
        telegram_id: 'seller_with_bonus_789',
        status: 'active',
        status_comment: null,
        permanent_rounding_bonus: '123.45'
      })
      .returning()
      .execute();

    const createdSeller = createResult[0];
    
    const banInput: BanSellerInput = {
      id: createdSeller.id,
      status_comment: 'Testing numeric conversion'
    };

    const result = await banSeller(banInput);

    expect(typeof result.permanent_rounding_bonus).toBe('number');
    expect(result.permanent_rounding_bonus).toEqual(123.45);
  });
});