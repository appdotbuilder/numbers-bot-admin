import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { l4_buyers } from '../db/schema';
import { getBuyers } from '../handlers/get_buyers';

describe('getBuyers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no buyers exist', async () => {
    const result = await getBuyers();

    expect(result).toEqual([]);
  });

  it('should return all buyers with correct fields', async () => {
    // Create test buyers
    await db.insert(l4_buyers)
      .values([
        {
          name: 'Buyer One',
          mode: 'manual',
          chat_id: 'chat001',
          max_numbers_per_branch: 5,
          is_banned: false
        },
        {
          name: 'Buyer Two',
          mode: 'auto',
          chat_id: 'chat002',
          max_numbers_per_branch: 15,
          is_banned: true,
          ban_reason: 'Violation of terms'
        }
      ])
      .execute();

    const result = await getBuyers();

    expect(result).toHaveLength(2);

    // Check first buyer
    const buyerOne = result.find(b => b.name === 'Buyer One');
    expect(buyerOne).toBeDefined();
    expect(buyerOne?.id).toBeDefined();
    expect(buyerOne?.name).toEqual('Buyer One');
    expect(buyerOne?.mode).toEqual('manual');
    expect(buyerOne?.chat_id).toEqual('chat001');
    expect(buyerOne?.max_numbers_per_branch).toEqual(5);
    expect(buyerOne?.is_banned).toEqual(false);
    expect(buyerOne?.ban_reason).toBeNull();
    expect(buyerOne?.created_at).toBeInstanceOf(Date);
    expect(buyerOne?.updated_at).toBeInstanceOf(Date);

    // Check second buyer (banned)
    const buyerTwo = result.find(b => b.name === 'Buyer Two');
    expect(buyerTwo).toBeDefined();
    expect(buyerTwo?.id).toBeDefined();
    expect(buyerTwo?.name).toEqual('Buyer Two');
    expect(buyerTwo?.mode).toEqual('auto');
    expect(buyerTwo?.chat_id).toEqual('chat002');
    expect(buyerTwo?.max_numbers_per_branch).toEqual(15);
    expect(buyerTwo?.is_banned).toEqual(true);
    expect(buyerTwo?.ban_reason).toEqual('Violation of terms');
    expect(buyerTwo?.created_at).toBeInstanceOf(Date);
    expect(buyerTwo?.updated_at).toBeInstanceOf(Date);
  });

  it('should return buyers in consistent order', async () => {
    // Create multiple buyers to test ordering
    await db.insert(l4_buyers)
      .values([
        {
          name: 'Buyer C',
          mode: 'manual',
          chat_id: 'chat003',
          max_numbers_per_branch: 10
        },
        {
          name: 'Buyer A',
          mode: 'auto',
          chat_id: 'chat001',
          max_numbers_per_branch: 20
        },
        {
          name: 'Buyer B',
          mode: 'manual',
          chat_id: 'chat002',
          max_numbers_per_branch: 5
        }
      ])
      .execute();

    const result1 = await getBuyers();
    const result2 = await getBuyers();

    expect(result1).toHaveLength(3);
    expect(result2).toHaveLength(3);

    // Results should be consistent between calls
    expect(result1.map(b => b.id)).toEqual(result2.map(b => b.id));
    expect(result1.map(b => b.name)).toEqual(result2.map(b => b.name));
  });

  it('should handle buyers with default values correctly', async () => {
    // Create buyer with only required fields (should get defaults)
    await db.insert(l4_buyers)
      .values({
        name: 'Default Buyer',
        mode: 'standard',
        chat_id: 'defaultchat'
        // max_numbers_per_branch and is_banned should use defaults
      })
      .execute();

    const result = await getBuyers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Default Buyer');
    expect(result[0].mode).toEqual('standard');
    expect(result[0].chat_id).toEqual('defaultchat');
    expect(result[0].max_numbers_per_branch).toEqual(10); // Default value
    expect(result[0].is_banned).toEqual(false); // Default value
    expect(result[0].ban_reason).toBeNull();
  });
});