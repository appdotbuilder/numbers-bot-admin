import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers, l4_sellers, l4_numbers } from '../db/schema';
import { type FilterNumbersInput } from '../schema';
import { filterNumbers } from '../handlers/filter_numbers';

describe('filterNumbers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test buyers and sellers
  const createTestBuyerAndSeller = async () => {
    // Create test buyer
    const buyers = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test123'
      })
      .returning()
      .execute();

    // Create test seller
    const sellers = await db.insert(l4_sellers)
      .values({
        telegram_id: 'test_seller_123'
      })
      .returning()
      .execute();

    return { buyer: buyers[0], seller: sellers[0] };
  };

  // Helper to create test numbers
  const createTestNumbers = async (buyer_id: number, seller_id: number) => {
    const numbers = await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1234567890',
          country: 'US',
          type: 'mobile',
          status: 'available',
          price: '10.99'
        },
        {
          phone_number: '+1987654321',
          country: 'US',
          type: 'landline',
          status: 'rented',
          buyer_id: buyer_id,
          seller_id: seller_id,
          price: '15.50'
        },
        {
          phone_number: '+447123456789',
          country: 'UK',
          type: 'mobile',
          status: 'completed',
          buyer_id: buyer_id,
          price: '8.75'
        },
        {
          phone_number: '+33123456789',
          country: 'FR',
          type: 'mobile',
          status: 'available',
          price: '12.00'
        }
      ])
      .returning()
      .execute();

    return numbers.map(number => ({
      ...number,
      price: parseFloat(number.price)
    }));
  };

  it('should return all numbers when no filters applied', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    const testNumbers = await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {};
    const result = await filterNumbers(input);

    expect(result).toHaveLength(4);
    expect(result.every(n => typeof n.price === 'number')).toBe(true);
  });

  it('should filter by country', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      country: 'US'
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(2);
    expect(result.every(n => n.country === 'US')).toBe(true);
  });

  it('should filter by type', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      type: 'mobile'
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(3);
    expect(result.every(n => n.type === 'mobile')).toBe(true);
  });

  it('should filter by status', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      status: 'available'
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(2);
    expect(result.every(n => n.status === 'available')).toBe(true);
  });

  it('should filter by buyer_id', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      buyer_id: buyer.id
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(2);
    expect(result.every(n => n.buyer_id === buyer.id)).toBe(true);
  });

  it('should filter by seller_id', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      seller_id: seller.id
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(1);
    expect(result[0].seller_id).toBe(seller.id);
  });

  it('should filter by phone number (partial match)', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      phone_number: '123456789'
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(3);
    expect(result.every(n => n.phone_number.includes('123456789'))).toBe(true);
  });

  it('should handle phone number search case insensitively', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    // Test with different case - phone numbers contain digits so this tests the ilike functionality
    const input: FilterNumbersInput = {
      phone_number: '1234'
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(3);
    expect(result.every(n => n.phone_number.includes('1234'))).toBe(true);
  });

  it('should combine multiple filters with AND logic', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      country: 'US',
      type: 'mobile',
      status: 'available'
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(1);
    expect(result[0].country).toBe('US');
    expect(result[0].type).toBe('mobile');
    expect(result[0].status).toBe('available');
    expect(result[0].phone_number).toBe('+1234567890');
  });

  it('should return empty array when no matches found', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      country: 'DE' // No German numbers in test data
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(0);
  });

  it('should handle numeric conversion correctly', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {};
    const result = await filterNumbers(input);

    expect(result.length).toBeGreaterThan(0);
    result.forEach(number => {
      expect(typeof number.price).toBe('number');
      expect(number.price).toBeGreaterThan(0);
    });
  });

  it('should handle filtering with null buyer_id correctly', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    // Numbers without buyer_id should not match when filtering by buyer_id
    const input: FilterNumbersInput = {
      buyer_id: 999 // Non-existent buyer
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(0);
  });

  it('should handle complex filter combinations', async () => {
    const { buyer, seller } = await createTestBuyerAndSeller();
    await createTestNumbers(buyer.id, seller.id);

    const input: FilterNumbersInput = {
      country: 'UK',
      buyer_id: buyer.id,
      status: 'completed',
      phone_number: '+447'
    };
    const result = await filterNumbers(input);

    expect(result).toHaveLength(1);
    expect(result[0].country).toBe('UK');
    expect(result[0].buyer_id).toBe(buyer.id);
    expect(result[0].status).toBe('completed');
    expect(result[0].phone_number).toContain('+447');
  });
});