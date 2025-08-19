import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { getSellers } from '../handlers/get_sellers';

describe('getSellers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sellers exist', async () => {
    const result = await getSellers();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all sellers with correct data types', async () => {
    // Create test sellers
    await db.insert(l4_sellers)
      .values([
        {
          telegram_id: 'seller_001',
          status: 'active',
          status_comment: 'All good',
          permanent_rounding_bonus: '5.25'
        },
        {
          telegram_id: 'seller_002', 
          status: 'inactive',
          status_comment: null,
          permanent_rounding_bonus: '0'
        },
        {
          telegram_id: 'seller_003',
          status: 'banned',
          status_comment: 'Policy violation',
          permanent_rounding_bonus: '10.50'
        }
      ])
      .execute();

    const result = await getSellers();

    expect(result).toHaveLength(3);
    
    // Check first seller
    const activeSeller = result.find(s => s.telegram_id === 'seller_001');
    expect(activeSeller).toBeDefined();
    expect(activeSeller!.telegram_id).toEqual('seller_001');
    expect(activeSeller!.status).toEqual('active');
    expect(activeSeller!.status_comment).toEqual('All good');
    expect(activeSeller!.permanent_rounding_bonus).toEqual(5.25);
    expect(typeof activeSeller!.permanent_rounding_bonus).toEqual('number');
    expect(activeSeller!.id).toBeDefined();
    expect(activeSeller!.created_at).toBeInstanceOf(Date);
    expect(activeSeller!.updated_at).toBeInstanceOf(Date);

    // Check second seller (inactive with null comment)
    const inactiveSeller = result.find(s => s.telegram_id === 'seller_002');
    expect(inactiveSeller).toBeDefined();
    expect(inactiveSeller!.status).toEqual('inactive');
    expect(inactiveSeller!.status_comment).toBeNull();
    expect(inactiveSeller!.permanent_rounding_bonus).toEqual(0);
    expect(typeof inactiveSeller!.permanent_rounding_bonus).toEqual('number');

    // Check third seller (banned)
    const bannedSeller = result.find(s => s.telegram_id === 'seller_003');
    expect(bannedSeller).toBeDefined();
    expect(bannedSeller!.status).toEqual('banned');
    expect(bannedSeller!.status_comment).toEqual('Policy violation');
    expect(bannedSeller!.permanent_rounding_bonus).toEqual(10.5);
    expect(typeof bannedSeller!.permanent_rounding_bonus).toEqual('number');
  });

  it('should handle sellers with default values', async () => {
    // Create seller with default values (active status, 0 bonus)
    await db.insert(l4_sellers)
      .values({
        telegram_id: 'default_seller',
        // Other fields will use defaults
      })
      .execute();

    const result = await getSellers();

    expect(result).toHaveLength(1);
    const seller = result[0];
    
    expect(seller.telegram_id).toEqual('default_seller');
    expect(seller.status).toEqual('active'); // Default value
    expect(seller.status_comment).toBeNull(); // Nullable field default
    expect(seller.permanent_rounding_bonus).toEqual(0); // Default value
    expect(typeof seller.permanent_rounding_bonus).toEqual('number');
  });

  it('should handle numeric conversion correctly', async () => {
    // Test various numeric values including decimals
    await db.insert(l4_sellers)
      .values([
        {
          telegram_id: 'seller_decimal',
          permanent_rounding_bonus: '15.99'
        },
        {
          telegram_id: 'seller_zero',
          permanent_rounding_bonus: '0.00'
        },
        {
          telegram_id: 'seller_large',
          permanent_rounding_bonus: '999999.99'
        }
      ])
      .execute();

    const result = await getSellers();

    expect(result).toHaveLength(3);
    
    const decimalSeller = result.find(s => s.telegram_id === 'seller_decimal');
    expect(decimalSeller!.permanent_rounding_bonus).toEqual(15.99);
    expect(typeof decimalSeller!.permanent_rounding_bonus).toEqual('number');

    const zeroSeller = result.find(s => s.telegram_id === 'seller_zero');
    expect(zeroSeller!.permanent_rounding_bonus).toEqual(0);
    expect(typeof zeroSeller!.permanent_rounding_bonus).toEqual('number');

    const largeSeller = result.find(s => s.telegram_id === 'seller_large');
    expect(largeSeller!.permanent_rounding_bonus).toEqual(999999.99);
    expect(typeof largeSeller!.permanent_rounding_bonus).toEqual('number');
  });

  it('should maintain correct ordering of results', async () => {
    // Create sellers and verify they maintain database insertion order
    const testSellers = [
      { telegram_id: 'seller_a', status: 'active' as const },
      { telegram_id: 'seller_b', status: 'inactive' as const },
      { telegram_id: 'seller_c', status: 'banned' as const }
    ];

    await db.insert(l4_sellers)
      .values(testSellers)
      .execute();

    const result = await getSellers();

    expect(result).toHaveLength(3);
    
    // Results should maintain insertion order (by ID)
    expect(result[0].telegram_id).toEqual('seller_a');
    expect(result[1].telegram_id).toEqual('seller_b');
    expect(result[2].telegram_id).toEqual('seller_c');
    
    // Verify IDs are sequential
    expect(result[0].id < result[1].id).toBe(true);
    expect(result[1].id < result[2].id).toBe(true);
  });
});