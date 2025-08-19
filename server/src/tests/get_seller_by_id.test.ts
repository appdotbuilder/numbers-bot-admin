import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_sellers } from '../db/schema';
import { getSellerById } from '../handlers/get_seller_by_id';

describe('getSellerById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a seller by id', async () => {
    // Create test seller
    const testSellers = await db.insert(l4_sellers)
      .values({
        telegram_id: 'test_seller_123',
        status: 'active',
        status_comment: 'Test seller for ID lookup',
        permanent_rounding_bonus: '15.50'
      })
      .returning()
      .execute();

    const sellerId = testSellers[0].id;
    const result = await getSellerById(sellerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(sellerId);
    expect(result!.telegram_id).toEqual('test_seller_123');
    expect(result!.status).toEqual('active');
    expect(result!.status_comment).toEqual('Test seller for ID lookup');
    expect(result!.permanent_rounding_bonus).toEqual(15.50);
    expect(typeof result!.permanent_rounding_bonus).toEqual('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent seller', async () => {
    const result = await getSellerById(999999);
    expect(result).toBeNull();
  });

  it('should handle seller with null status_comment', async () => {
    // Create test seller with null comment
    const testSellers = await db.insert(l4_sellers)
      .values({
        telegram_id: 'seller_no_comment',
        status: 'inactive',
        status_comment: null,
        permanent_rounding_bonus: '0'
      })
      .returning()
      .execute();

    const sellerId = testSellers[0].id;
    const result = await getSellerById(sellerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(sellerId);
    expect(result!.telegram_id).toEqual('seller_no_comment');
    expect(result!.status).toEqual('inactive');
    expect(result!.status_comment).toBeNull();
    expect(result!.permanent_rounding_bonus).toEqual(0);
    expect(typeof result!.permanent_rounding_bonus).toEqual('number');
  });

  it('should handle seller with banned status', async () => {
    // Create banned seller
    const testSellers = await db.insert(l4_sellers)
      .values({
        telegram_id: 'banned_seller_456',
        status: 'banned',
        status_comment: 'Violated terms of service',
        permanent_rounding_bonus: '25.75'
      })
      .returning()
      .execute();

    const sellerId = testSellers[0].id;
    const result = await getSellerById(sellerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(sellerId);
    expect(result!.telegram_id).toEqual('banned_seller_456');
    expect(result!.status).toEqual('banned');
    expect(result!.status_comment).toEqual('Violated terms of service');
    expect(result!.permanent_rounding_bonus).toEqual(25.75);
    expect(typeof result!.permanent_rounding_bonus).toEqual('number');
  });

  it('should handle seller with zero permanent_rounding_bonus', async () => {
    // Create seller with zero bonus
    const testSellers = await db.insert(l4_sellers)
      .values({
        telegram_id: 'zero_bonus_seller',
        status: 'active',
        permanent_rounding_bonus: '0.00'
      })
      .returning()
      .execute();

    const sellerId = testSellers[0].id;
    const result = await getSellerById(sellerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(sellerId);
    expect(result!.permanent_rounding_bonus).toEqual(0);
    expect(typeof result!.permanent_rounding_bonus).toEqual('number');
  });

  it('should handle seller with large permanent_rounding_bonus', async () => {
    // Create seller with large bonus
    const testSellers = await db.insert(l4_sellers)
      .values({
        telegram_id: 'high_bonus_seller',
        status: 'active',
        permanent_rounding_bonus: '999.99'
      })
      .returning()
      .execute();

    const sellerId = testSellers[0].id;
    const result = await getSellerById(sellerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(sellerId);
    expect(result!.permanent_rounding_bonus).toEqual(999.99);
    expect(typeof result!.permanent_rounding_bonus).toEqual('number');
  });
});