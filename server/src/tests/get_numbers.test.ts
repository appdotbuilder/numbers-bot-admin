import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_numbers, l4_buyers, l4_sellers } from '../db/schema';
import { getNumbers } from '../handlers/get_numbers';

describe('getNumbers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no numbers exist', async () => {
    const result = await getNumbers();

    expect(result).toEqual([]);
  });

  it('should fetch all numbers with correct data types', async () => {
    // Create prerequisite data first
    const [buyer] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test123',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    const [seller] = await db.insert(l4_sellers)
      .values({
        telegram_id: 'seller123',
        status: 'active',
        permanent_rounding_bonus: '5.50'
      })
      .returning()
      .execute();

    // Insert test numbers
    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1234567890',
          country: 'US',
          type: 'mobile',
          status: 'available',
          price: '19.99'
        },
        {
          phone_number: '+9876543210',
          country: 'UK',
          type: 'landline',
          status: 'rented',
          buyer_id: buyer.id,
          seller_id: seller.id,
          rented_at: new Date(),
          price: '25.50'
        }
      ])
      .execute();

    const result = await getNumbers();

    // Verify we get all numbers
    expect(result).toHaveLength(2);

    // Check first number
    const firstNumber = result.find(n => n.phone_number === '+1234567890');
    expect(firstNumber).toBeDefined();
    expect(firstNumber!.phone_number).toEqual('+1234567890');
    expect(firstNumber!.country).toEqual('US');
    expect(firstNumber!.type).toEqual('mobile');
    expect(firstNumber!.status).toEqual('available');
    expect(firstNumber!.buyer_id).toBeNull();
    expect(firstNumber!.seller_id).toBeNull();
    expect(firstNumber!.rented_at).toBeNull();
    expect(firstNumber!.completed_at).toBeNull();
    expect(firstNumber!.price).toEqual(19.99);
    expect(typeof firstNumber!.price).toEqual('number');
    expect(firstNumber!.id).toBeDefined();
    expect(firstNumber!.created_at).toBeInstanceOf(Date);
    expect(firstNumber!.updated_at).toBeInstanceOf(Date);

    // Check second number
    const secondNumber = result.find(n => n.phone_number === '+9876543210');
    expect(secondNumber).toBeDefined();
    expect(secondNumber!.phone_number).toEqual('+9876543210');
    expect(secondNumber!.country).toEqual('UK');
    expect(secondNumber!.type).toEqual('landline');
    expect(secondNumber!.status).toEqual('rented');
    expect(secondNumber!.buyer_id).toEqual(buyer.id);
    expect(secondNumber!.seller_id).toEqual(seller.id);
    expect(secondNumber!.rented_at).toBeInstanceOf(Date);
    expect(secondNumber!.completed_at).toBeNull();
    expect(secondNumber!.price).toEqual(25.50);
    expect(typeof secondNumber!.price).toEqual('number');
    expect(secondNumber!.id).toBeDefined();
    expect(secondNumber!.created_at).toBeInstanceOf(Date);
    expect(secondNumber!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple numbers with different statuses', async () => {
    // Insert numbers with various statuses
    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1111111111',
          country: 'US',
          type: 'mobile',
          status: 'available',
          price: '10.00'
        },
        {
          phone_number: '+2222222222',
          country: 'CA',
          type: 'mobile',
          status: 'accepted',
          price: '15.00'
        },
        {
          phone_number: '+3333333333',
          country: 'UK',
          type: 'landline',
          status: 'completed',
          completed_at: new Date(),
          price: '20.00'
        },
        {
          phone_number: '+4444444444',
          country: 'DE',
          type: 'mobile',
          status: 'cancelled',
          price: '12.50'
        },
        {
          phone_number: '+5555555555',
          country: 'FR',
          type: 'landline',
          status: 'returned_to_queue',
          price: '18.75'
        }
      ])
      .execute();

    const result = await getNumbers();

    expect(result).toHaveLength(5);

    // Verify all statuses are present
    const statuses = result.map(n => n.status);
    expect(statuses).toContain('available');
    expect(statuses).toContain('accepted');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('cancelled');
    expect(statuses).toContain('returned_to_queue');

    // Verify all prices are converted to numbers
    result.forEach(number => {
      expect(typeof number.price).toEqual('number');
      expect(number.price).toBeGreaterThan(0);
    });

    // Verify countries and types
    const countries = result.map(n => n.country);
    expect(countries).toContain('US');
    expect(countries).toContain('CA');
    expect(countries).toContain('UK');
    expect(countries).toContain('DE');
    expect(countries).toContain('FR');

    const types = result.map(n => n.type);
    expect(types).toContain('mobile');
    expect(types).toContain('landline');
  });

  it('should preserve correct decimal precision for prices', async () => {
    // Insert numbers with various price formats
    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1111111111',
          country: 'US',
          type: 'mobile',
          status: 'available',
          price: '10.99'
        },
        {
          phone_number: '+2222222222',
          country: 'CA',
          type: 'mobile',
          status: 'available',
          price: '15.50'
        },
        {
          phone_number: '+3333333333',
          country: 'UK',
          type: 'landline',
          status: 'available',
          price: '20.00'
        }
      ])
      .execute();

    const result = await getNumbers();

    expect(result).toHaveLength(3);

    // Verify decimal precision is maintained
    const prices = result.map(n => n.price).sort();
    expect(prices[0]).toEqual(10.99);
    expect(prices[1]).toEqual(15.50);
    expect(prices[2]).toEqual(20.00);

    // Verify all are numbers
    prices.forEach(price => {
      expect(typeof price).toEqual('number');
    });
  });
});