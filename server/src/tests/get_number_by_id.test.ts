import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_numbers, l4_buyers, l4_sellers } from '../db/schema';
import { getNumberById } from '../handlers/get_number_by_id';

describe('getNumberById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a number when it exists', async () => {
    // Create test buyer and seller first (for foreign keys)
    const [buyer] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'manual',
        chat_id: 'test_chat_123',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    const [seller] = await db.insert(l4_sellers)
      .values({
        telegram_id: 'test_seller_123',
        status: 'active',
        permanent_rounding_bonus: '5.50'
      })
      .returning()
      .execute();

    // Create test number
    const [testNumber] = await db.insert(l4_numbers)
      .values({
        phone_number: '+1234567890',
        country: 'USA',
        type: 'mobile',
        status: 'rented',
        buyer_id: buyer.id,
        seller_id: seller.id,
        price: '19.99',
        rented_at: new Date(),
        completed_at: null
      })
      .returning()
      .execute();

    const result = await getNumberById(testNumber.id);

    // Verify all fields are returned correctly
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testNumber.id);
    expect(result!.phone_number).toEqual('+1234567890');
    expect(result!.country).toEqual('USA');
    expect(result!.type).toEqual('mobile');
    expect(result!.status).toEqual('rented');
    expect(result!.buyer_id).toEqual(buyer.id);
    expect(result!.seller_id).toEqual(seller.id);
    expect(result!.price).toEqual(19.99);
    expect(typeof result!.price).toEqual('number');
    expect(result!.rented_at).toBeInstanceOf(Date);
    expect(result!.completed_at).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when number does not exist', async () => {
    const result = await getNumberById(99999);

    expect(result).toBeNull();
  });

  it('should handle numbers without buyer and seller (null foreign keys)', async () => {
    // Create test number without foreign key references
    const [testNumber] = await db.insert(l4_numbers)
      .values({
        phone_number: '+9876543210',
        country: 'UK',
        type: 'landline',
        status: 'available',
        buyer_id: null,
        seller_id: null,
        price: '25.00',
        rented_at: null,
        completed_at: null
      })
      .returning()
      .execute();

    const result = await getNumberById(testNumber.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testNumber.id);
    expect(result!.phone_number).toEqual('+9876543210');
    expect(result!.country).toEqual('UK');
    expect(result!.type).toEqual('landline');
    expect(result!.status).toEqual('available');
    expect(result!.buyer_id).toBeNull();
    expect(result!.seller_id).toBeNull();
    expect(result!.price).toEqual(25.00);
    expect(typeof result!.price).toEqual('number');
    expect(result!.rented_at).toBeNull();
    expect(result!.completed_at).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different number statuses correctly', async () => {
    const statuses = ['available', 'rented', 'accepted', 'completed', 'cancelled', 'returned_to_queue'] as const;
    
    for (const status of statuses) {
      // Create test number with specific status
      const [testNumber] = await db.insert(l4_numbers)
        .values({
          phone_number: `+123456789${statuses.indexOf(status)}`,
          country: 'CA',
          type: 'mobile',
          status: status,
          buyer_id: null,
          seller_id: null,
          price: '15.50'
        })
        .returning()
        .execute();

      const result = await getNumberById(testNumber.id);

      expect(result).not.toBeNull();
      expect(result!.status).toEqual(status);
      expect(result!.price).toEqual(15.50);
    }
  });

  it('should handle numeric price conversions correctly', async () => {
    // Test various price formats
    const testPrices = ['0.01', '999.99', '100.00', '50.5'];
    const expectedPrices = [0.01, 999.99, 100.00, 50.5];

    for (let i = 0; i < testPrices.length; i++) {
      const [testNumber] = await db.insert(l4_numbers)
        .values({
          phone_number: `+555000000${i}`,
          country: 'AU',
          type: 'mobile',
          status: 'available',
          buyer_id: null,
          seller_id: null,
          price: testPrices[i]
        })
        .returning()
        .execute();

      const result = await getNumberById(testNumber.id);

      expect(result).not.toBeNull();
      expect(result!.price).toEqual(expectedPrices[i]);
      expect(typeof result!.price).toEqual('number');
    }
  });
});