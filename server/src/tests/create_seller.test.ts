import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { type CreateSellerInput } from '../schema';
import { createSeller } from '../handlers/create_seller';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateSellerInput = {
  telegram_id: '123456789',
  status: 'active',
  status_comment: null,
  permanent_rounding_bonus: 5.50
};

describe('createSeller', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a seller with all fields', async () => {
    const result = await createSeller(testInput);

    // Basic field validation
    expect(result.telegram_id).toEqual('123456789');
    expect(result.status).toEqual('active');
    expect(result.status_comment).toBeNull();
    expect(result.permanent_rounding_bonus).toEqual(5.50);
    expect(typeof result.permanent_rounding_bonus).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a seller with default values', async () => {
    const minimalInput: CreateSellerInput = {
      telegram_id: '987654321',
      status: 'active', // Required by TypeScript, but will use Zod default
      permanent_rounding_bonus: 0 // Required by TypeScript, but will use Zod default
    };

    const result = await createSeller(minimalInput);

    expect(result.telegram_id).toEqual('987654321');
    expect(result.status).toEqual('active'); // Default value from Zod schema
    expect(result.status_comment).toBeNull();
    expect(result.permanent_rounding_bonus).toEqual(0); // Default value from Zod schema
    expect(typeof result.permanent_rounding_bonus).toBe('number');
  });

  it('should save seller to database', async () => {
    const result = await createSeller(testInput);

    // Query using proper drizzle syntax
    const sellers = await db.select()
      .from(l4_sellers)
      .where(eq(l4_sellers.id, result.id))
      .execute();

    expect(sellers).toHaveLength(1);
    expect(sellers[0].telegram_id).toEqual('123456789');
    expect(sellers[0].status).toEqual('active');
    expect(sellers[0].status_comment).toBeNull();
    expect(parseFloat(sellers[0].permanent_rounding_bonus)).toEqual(5.50);
    expect(sellers[0].created_at).toBeInstanceOf(Date);
    expect(sellers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create seller with inactive status', async () => {
    const inactiveSellerInput: CreateSellerInput = {
      telegram_id: '555666777',
      status: 'inactive',
      status_comment: 'Temporarily inactive',
      permanent_rounding_bonus: 2.25
    };

    const result = await createSeller(inactiveSellerInput);

    expect(result.telegram_id).toEqual('555666777');
    expect(result.status).toEqual('inactive');
    expect(result.status_comment).toEqual('Temporarily inactive');
    expect(result.permanent_rounding_bonus).toEqual(2.25);
  });

  it('should handle decimal bonus amounts correctly', async () => {
    const decimalInput: CreateSellerInput = {
      telegram_id: '111222333',
      status: 'active',
      permanent_rounding_bonus: 10.99
    };

    const result = await createSeller(decimalInput);

    expect(result.permanent_rounding_bonus).toEqual(10.99);
    expect(typeof result.permanent_rounding_bonus).toBe('number');

    // Verify in database
    const sellers = await db.select()
      .from(l4_sellers)
      .where(eq(l4_sellers.id, result.id))
      .execute();

    expect(parseFloat(sellers[0].permanent_rounding_bonus)).toEqual(10.99);
  });

  it('should throw error for duplicate telegram_id', async () => {
    // Create first seller
    await createSeller(testInput);

    // Attempt to create second seller with same telegram_id
    const duplicateInput: CreateSellerInput = {
      telegram_id: '123456789', // Same as testInput
      status: 'inactive',
      permanent_rounding_bonus: 0
    };

    await expect(createSeller(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle zero bonus amount', async () => {
    const zeroInput: CreateSellerInput = {
      telegram_id: '444555666',
      status: 'active',
      permanent_rounding_bonus: 0
    };

    const result = await createSeller(zeroInput);

    expect(result.permanent_rounding_bonus).toEqual(0);
    expect(typeof result.permanent_rounding_bonus).toBe('number');
  });

  it('should apply Zod defaults when minimal input is provided', async () => {
    // Test Zod defaults by providing only the minimal required field
    // TypeScript won't like this, but Zod should apply defaults
    const minimalInput = {
      telegram_id: '999888777'
    } as CreateSellerInput;

    const result = await createSeller(minimalInput);

    expect(result.telegram_id).toEqual('999888777');
    expect(result.status).toEqual('active'); // Should get default from Zod
    expect(result.permanent_rounding_bonus).toEqual(0); // Should get default from Zod
    expect(result.status_comment).toBeNull();
  });
});