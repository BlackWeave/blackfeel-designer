import { describe, it, expect, vi } from 'vitest';
import { db } from '../models/database.js';
import pool from '../config/db.js';

describe('Database Models & Business Logic', () => {
  it('createOrder should apply correct pricing tiers', async () => {
    // Mock pool.query to capture the inserted values
    vi.mocked(pool.query).mockImplementation((sql, params) => {
      return Promise.resolve({ rows: [{ id: params[0], amount_in_paise: params[4], status: 'draft' }] });
    });

    // Test XXL + Custom Text + Qty 2
    // Base: 49900 + Size: 29900 + Text: 10000 = 89800 * 2 = 179600
    const order = await db.createOrder('u1', 'd1', null, 'XXL', 2, 'Custom Text', null);
    expect(order.amount_in_paise).toBe(179600);
  });

  it('createFulfillmentJob should correctly map front/back designs', async () => {
    vi.mocked(pool.query).mockImplementation((sql, params) => {
      if (sql.includes('SELECT o.id')) {
        return Promise.resolve({ rows: [{
          order_id: 'o1', tshirt_size: 'M', combined_mockup_url: 'http://mock.com/combined.jpg',
          design_id_front: 'df1', front_tshirt_color: '#1a1a1a', front_finalized_url: 'http://mock.com/f.jpg', front_processed_url: 'http://mock.com/fp.png',
          design_id_back: 'db1', back_tshirt_color: '#1a1a1a', back_processed_url: 'http://mock.com/bp.png'
        }] });
      }
      return Promise.resolve({ rows: [{ id: 'f1' }] });
    });

    const job = await db.createFulfillmentJob('o1');
    expect(job.id).toBe('f1');
    // Verify the insert query was called with correct mapping
    const insertCall = vi.mocked(pool.query).mock.calls.find(c => c[0].includes('INSERT INTO fulfillment_queue'));
    expect(insertCall[1][4]).toBe('http://mock.com/combined.jpg'); // print_mockup_url
    expect(insertCall[1][5]).toBe('http://mock.com/fp.png'); // raw_design_url_front
    expect(insertCall[1][6]).toBe('http://mock.com/bp.png'); // raw_design_url_back
  });
});