import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers, l4_sellers, l4_numbers } from '../db/schema';
import { type GenerateDailyInvoiceInput } from '../schema';
import { generateDailyInvoice } from '../handlers/generate_daily_invoice';

describe('generateDailyInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testBuyerId: number;
  let testSellerId: number;

  beforeEach(async () => {
    // Create test buyer
    const buyers = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test_chat_123',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();
    testBuyerId = buyers[0].id;

    // Create test seller
    const sellers = await db.insert(l4_sellers)
      .values({
        telegram_id: 'test_seller_123',
        status: 'active'
      })
      .returning()
      .execute();
    testSellerId = sellers[0].id;
  });

  it('should generate invoice for buyer with rentals on specified date', async () => {
    // Create test numbers rented on the target date
    const targetDate = new Date('2024-01-15T10:00:00Z');
    
    const numbers = await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1234567890',
          country: 'US',
          type: 'sms',
          status: 'rented',
          buyer_id: testBuyerId,
          seller_id: testSellerId,
          price: '5.99',
          rented_at: targetDate
        },
        {
          phone_number: '+1234567891',
          country: 'US',
          type: 'voice',
          status: 'completed',
          buyer_id: testBuyerId,
          seller_id: testSellerId,
          price: '12.50',
          rented_at: new Date('2024-01-15T14:30:00Z'),
          completed_at: new Date('2024-01-15T15:00:00Z')
        }
      ])
      .returning()
      .execute();

    const input: GenerateDailyInvoiceInput = {
      buyer_id: testBuyerId,
      date: '2024-01-15'
    };

    const result = await generateDailyInvoice(input);

    // Verify invoice structure
    expect(result.buyer_id).toBe(testBuyerId);
    expect(result.buyer_name).toBe('Test Buyer');
    expect(result.date).toBe('2024-01-15');
    expect(result.total_numbers_rented).toBe(2);
    expect(result.total_amount).toBeCloseTo(18.49, 2); // 5.99 + 12.50
    expect(result.numbers).toHaveLength(2);

    // Verify first number details
    const firstNumber = result.numbers.find(n => n.phone_number === '+1234567890');
    expect(firstNumber).toBeDefined();
    expect(firstNumber!.id).toBe(numbers[0].id);
    expect(firstNumber!.country).toBe('US');
    expect(firstNumber!.type).toBe('sms');
    expect(typeof firstNumber!.price).toBe('number');
    expect(firstNumber!.price).toBe(5.99);
    expect(firstNumber!.rented_at).toEqual(targetDate);
    expect(firstNumber!.completed_at).toBeNull();

    // Verify second number details
    const secondNumber = result.numbers.find(n => n.phone_number === '+1234567891');
    expect(secondNumber).toBeDefined();
    expect(secondNumber!.price).toBe(12.50);
    expect(secondNumber!.completed_at).toBeInstanceOf(Date);
  });

  it('should generate empty invoice for buyer with no rentals on specified date', async () => {
    // Create a number rented on a different date
    await db.insert(l4_numbers)
      .values({
        phone_number: '+1234567890',
        country: 'US',
        type: 'sms',
        status: 'rented',
        buyer_id: testBuyerId,
        seller_id: testSellerId,
        price: '5.99',
        rented_at: new Date('2024-01-14T10:00:00Z') // Different date
      })
      .execute();

    const input: GenerateDailyInvoiceInput = {
      buyer_id: testBuyerId,
      date: '2024-01-15'
    };

    const result = await generateDailyInvoice(input);

    expect(result.buyer_id).toBe(testBuyerId);
    expect(result.buyer_name).toBe('Test Buyer');
    expect(result.date).toBe('2024-01-15');
    expect(result.total_numbers_rented).toBe(0);
    expect(result.total_amount).toBe(0);
    expect(result.numbers).toHaveLength(0);
  });

  it('should only include numbers rented by the specified buyer', async () => {
    // Create another buyer
    const otherBuyers = await db.insert(l4_buyers)
      .values({
        name: 'Other Buyer',
        mode: 'test',
        chat_id: 'other_chat_456',
        max_numbers_per_branch: 5
      })
      .returning()
      .execute();
    const otherBuyerId = otherBuyers[0].id;

    const targetDate = new Date('2024-01-15T10:00:00Z');

    // Create numbers for both buyers on the same date
    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1234567890',
          country: 'US',
          type: 'sms',
          status: 'rented',
          buyer_id: testBuyerId,
          seller_id: testSellerId,
          price: '5.99',
          rented_at: targetDate
        },
        {
          phone_number: '+1234567891',
          country: 'US',
          type: 'sms',
          status: 'rented',
          buyer_id: otherBuyerId,
          seller_id: testSellerId,
          price: '7.50',
          rented_at: targetDate
        }
      ])
      .execute();

    const input: GenerateDailyInvoiceInput = {
      buyer_id: testBuyerId,
      date: '2024-01-15'
    };

    const result = await generateDailyInvoice(input);

    expect(result.total_numbers_rented).toBe(1);
    expect(result.total_amount).toBe(5.99);
    expect(result.numbers[0].phone_number).toBe('+1234567890');
  });

  it('should handle date boundaries correctly', async () => {
    const targetDate = new Date('2024-01-15T23:59:59Z'); // Very end of day
    const nextDayDate = new Date('2024-01-16T00:00:01Z'); // Very beginning of next day

    // Create numbers at different times
    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1234567890',
          country: 'US',
          type: 'sms',
          status: 'rented',
          buyer_id: testBuyerId,
          seller_id: testSellerId,
          price: '5.99',
          rented_at: targetDate // Should be included
        },
        {
          phone_number: '+1234567891',
          country: 'US',
          type: 'sms',
          status: 'rented',
          buyer_id: testBuyerId,
          seller_id: testSellerId,
          price: '7.50',
          rented_at: nextDayDate // Should NOT be included
        }
      ])
      .execute();

    const input: GenerateDailyInvoiceInput = {
      buyer_id: testBuyerId,
      date: '2024-01-15'
    };

    const result = await generateDailyInvoice(input);

    expect(result.total_numbers_rented).toBe(1);
    expect(result.total_amount).toBe(5.99);
    expect(result.numbers[0].phone_number).toBe('+1234567890');
  });

  it('should throw error for non-existent buyer', async () => {
    const input: GenerateDailyInvoiceInput = {
      buyer_id: 999999, // Non-existent buyer
      date: '2024-01-15'
    };

    await expect(generateDailyInvoice(input)).rejects.toThrow(/Buyer with id 999999 not found/i);
  });

  it('should calculate total amount correctly with decimal prices', async () => {
    const targetDate = new Date('2024-01-15T10:00:00Z');

    await db.insert(l4_numbers)
      .values([
        {
          phone_number: '+1234567890',
          country: 'US',
          type: 'sms',
          status: 'rented',
          buyer_id: testBuyerId,
          seller_id: testSellerId,
          price: '1.99',
          rented_at: targetDate
        },
        {
          phone_number: '+1234567891',
          country: 'US',
          type: 'voice',
          status: 'rented',
          buyer_id: testBuyerId,
          seller_id: testSellerId,
          price: '2.01',
          rented_at: targetDate
        },
        {
          phone_number: '+1234567892',
          country: 'US',
          type: 'sms',
          status: 'rented',
          buyer_id: testBuyerId,
          seller_id: testSellerId,
          price: '0.50',
          rented_at: targetDate
        }
      ])
      .execute();

    const input: GenerateDailyInvoiceInput = {
      buyer_id: testBuyerId,
      date: '2024-01-15'
    };

    const result = await generateDailyInvoice(input);

    expect(result.total_numbers_rented).toBe(3);
    expect(result.total_amount).toBe(4.5); // 1.99 + 2.01 + 0.50
    
    // Verify all prices are properly converted to numbers
    result.numbers.forEach(number => {
      expect(typeof number.price).toBe('number');
    });
  });
});