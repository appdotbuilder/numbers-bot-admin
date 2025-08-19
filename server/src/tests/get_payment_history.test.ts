import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers, l4_billing_records } from '../db/schema';
import { type GetPaymentHistoryInput } from '../schema';
import { getPaymentHistory } from '../handlers/get_payment_history';

// Test input with default values
const testInput: GetPaymentHistoryInput = {
  buyer_id: 1,
  limit: 50,
  offset: 0
};

describe('getPaymentHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return payment history for a buyer', async () => {
    // Create test buyer
    const [buyer] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test123',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    // Create test billing records
    await db.insert(l4_billing_records)
      .values([
        {
          buyer_id: buyer.id,
          amount: '25.99',
          description: 'Number rental fee',
          billing_date: new Date('2024-01-15')
        },
        {
          buyer_id: buyer.id,
          amount: '15.50',
          description: 'SMS service charge',
          billing_date: new Date('2024-01-16')
        }
      ])
      .execute();

    const result = await getPaymentHistory({ ...testInput, buyer_id: buyer.id });

    // Should return records ordered by billing_date desc
    expect(result).toHaveLength(2);
    expect(result[0].amount).toEqual(15.50); // Most recent first
    expect(result[0].description).toEqual('SMS service charge');
    expect(result[1].amount).toEqual(25.99); // Older second
    expect(result[1].description).toEqual('Number rental fee');
    
    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(typeof result[1].amount).toBe('number');

    // Verify all required fields
    result.forEach(record => {
      expect(record.id).toBeDefined();
      expect(record.buyer_id).toEqual(buyer.id);
      expect(record.amount).toBeTypeOf('number');
      expect(record.description).toBeDefined();
      expect(record.billing_date).toBeInstanceOf(Date);
      expect(record.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for buyer with no billing records', async () => {
    // Create test buyer
    const [buyer] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test124',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    const result = await getPaymentHistory({ ...testInput, buyer_id: buyer.id });

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent buyer', async () => {
    const result = await getPaymentHistory({ ...testInput, buyer_id: 99999 });

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle pagination correctly', async () => {
    // Create test buyer
    const [buyer] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test125',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    // Create multiple billing records
    const billingData = Array.from({ length: 10 }, (_, i) => ({
      buyer_id: buyer.id,
      amount: `${10.00 + i}`,
      description: `Payment ${i + 1}`,
      billing_date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`)
    }));

    await db.insert(l4_billing_records)
      .values(billingData)
      .execute();

    // Test first page
    const firstPage = await getPaymentHistory({
      buyer_id: buyer.id,
      limit: 3,
      offset: 0
    });

    expect(firstPage).toHaveLength(3);
    // Should be ordered by billing_date desc, so most recent first
    expect(firstPage[0].description).toEqual('Payment 10');
    expect(firstPage[1].description).toEqual('Payment 9');
    expect(firstPage[2].description).toEqual('Payment 8');

    // Test second page
    const secondPage = await getPaymentHistory({
      buyer_id: buyer.id,
      limit: 3,
      offset: 3
    });

    expect(secondPage).toHaveLength(3);
    expect(secondPage[0].description).toEqual('Payment 7');
    expect(secondPage[1].description).toEqual('Payment 6');
    expect(secondPage[2].description).toEqual('Payment 5');
  });

  it('should respect limit parameter', async () => {
    // Create test buyer
    const [buyer] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test126',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    // Create multiple billing records
    const billingData = Array.from({ length: 20 }, (_, i) => ({
      buyer_id: buyer.id,
      amount: `${10.00 + i}`,
      description: `Payment ${i + 1}`,
      billing_date: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}`)
    }));

    await db.insert(l4_billing_records)
      .values(billingData)
      .execute();

    // Test with small limit
    const result = await getPaymentHistory({
      buyer_id: buyer.id,
      limit: 5,
      offset: 0
    });

    expect(result).toHaveLength(5);
  });

  it('should order results by billing_date in descending order', async () => {
    // Create test buyer
    const [buyer] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer',
        mode: 'test',
        chat_id: 'test127',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    // Create billing records with different dates (not in order)
    await db.insert(l4_billing_records)
      .values([
        {
          buyer_id: buyer.id,
          amount: '10.00',
          description: 'Payment 1',
          billing_date: new Date('2024-01-10')
        },
        {
          buyer_id: buyer.id,
          amount: '20.00',
          description: 'Payment 2',
          billing_date: new Date('2024-01-20')
        },
        {
          buyer_id: buyer.id,
          amount: '15.00',
          description: 'Payment 3',
          billing_date: new Date('2024-01-15')
        }
      ])
      .execute();

    const result = await getPaymentHistory({ ...testInput, buyer_id: buyer.id });

    expect(result).toHaveLength(3);
    
    // Should be ordered by billing_date desc
    expect(result[0].description).toEqual('Payment 2'); // 2024-01-20
    expect(result[0].billing_date).toEqual(new Date('2024-01-20'));
    
    expect(result[1].description).toEqual('Payment 3'); // 2024-01-15
    expect(result[1].billing_date).toEqual(new Date('2024-01-15'));
    
    expect(result[2].description).toEqual('Payment 1'); // 2024-01-10
    expect(result[2].billing_date).toEqual(new Date('2024-01-10'));
  });

  it('should filter records by buyer_id correctly', async () => {
    // Create two test buyers
    const [buyer1] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer 1',
        mode: 'test',
        chat_id: 'test128',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    const [buyer2] = await db.insert(l4_buyers)
      .values({
        name: 'Test Buyer 2',
        mode: 'test',
        chat_id: 'test129',
        max_numbers_per_branch: 10
      })
      .returning()
      .execute();

    // Create billing records for both buyers
    await db.insert(l4_billing_records)
      .values([
        {
          buyer_id: buyer1.id,
          amount: '25.00',
          description: 'Buyer 1 Payment',
          billing_date: new Date('2024-01-15')
        },
        {
          buyer_id: buyer2.id,
          amount: '35.00',
          description: 'Buyer 2 Payment',
          billing_date: new Date('2024-01-16')
        }
      ])
      .execute();

    // Get history for buyer1 only
    const result = await getPaymentHistory({ ...testInput, buyer_id: buyer1.id });

    expect(result).toHaveLength(1);
    expect(result[0].buyer_id).toEqual(buyer1.id);
    expect(result[0].description).toEqual('Buyer 1 Payment');
    expect(result[0].amount).toEqual(25.00);
  });
});