import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { db } from '../models/database.js';

vi.mock('../models/database.js');

describe('Order Routes', () => {
  it('POST /api/orders/buy-now should calculate price correctly and create order', async () => {
    // Base 499 + XL tier 299 = 798 INR -> 79800 paise
    vi.mocked(db.getDesignById).mockResolvedValue({ id: 'd1', is_finalized: true, user_id: 'user-1' });
    vi.mocked(db.createOrder).mockImplementation((...args) => {
      // args[4] is quantity. We want to return a mock order object.
      // Base 499 + XL tier 299 = 798 INR -> 79800 paise
      return Promise.resolve({ id: 'o1', amount_in_paise: 79800, status: 'draft' });
    });

    const res = await request(app).post('/api/orders/buy-now')
      .set('Authorization', 'Bearer mock.jwt.token')
      .send({ designIdFront: 'd1', tshirtSize: 'XL', quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.amountInPaise).toBe(79800);
    expect(res.body.amountInRupees).toBe('798.00');
  });

  it('POST /api/orders/buy-now should reject non-finalized design', async () => {
    vi.mocked(db.getDesignById).mockResolvedValue({ id: 'd2', is_finalized: false, user_id: 'user-1' });
    const res = await request(app).post('/api/orders/buy-now')
      .set('Authorization', 'Bearer mock.jwt.token')
      .send({ designIdFront: 'd2', tshirtSize: 'M', quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Front design must be finalized before purchase');
  });
});