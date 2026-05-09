import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { db } from '../models/database.js';
import { razorpayService } from '../services/razorpay.js';
import { enhanceService } from '../services/enhanceService.js';

vi.mock('../models/database.js');

describe('Payment Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/payments/verify should process payment and trigger 4K upscale', async () => {
    vi.mocked(razorpayService.verifySignature).mockResolvedValue(true);
    vi.mocked(db.getOrderWithDesign).mockResolvedValue({
      id: 'o1', user_id: 'user-1', amount_in_paise: 49900, status: 'draft',
      processed_image_url: 'https://cdn.test.local/designs/front.webp',
      back_processed_image_url: null
    });
    vi.mocked(db.getPaymentByRazorpayId).mockResolvedValue(null);
    vi.mocked(db.createPayment).mockResolvedValue({ id: 'p1', status: 'authorized' });
    vi.mocked(db.updateOrderStatus).mockResolvedValue({ id: 'o1', status: 'paid' });
    vi.mocked(db.createFulfillmentJob).mockResolvedValue({ id: 'f1' });

    const res = await request(app).post('/api/payments/verify')
      .set('Authorization', 'Bearer mock.jwt.token')
      .send({ razorpayOrderId: 'order_mock', razorpayPaymentId: 'pay_mock', razorpaySignature: 'sig_mock' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(enhanceService.enhanceAndUploadToR2).toHaveBeenCalled();
    expect(db.updateFulfillmentRawDesignUrl).toHaveBeenCalledWith('o1', expect.any(String), 'front');
    expect(db.createFulfillmentJob).toHaveBeenCalledWith('o1');
  });

  it('POST /api/payments/verify should handle idempotent duplicate calls', async () => {
    vi.mocked(razorpayService.verifySignature).mockResolvedValue(true);
    vi.mocked(db.getOrderWithDesign).mockResolvedValue({ id: 'o1', user_id: 'user-1', amount_in_paise: 49900 });
    vi.mocked(db.getPaymentByRazorpayId).mockResolvedValue({ id: 'p1' }); // Already exists

    const res = await request(app).post('/api/payments/verify')
      .set('Authorization', 'Bearer mock.jwt.token')
      .send({ razorpayOrderId: 'order_mock', razorpayPaymentId: 'pay_mock', razorpaySignature: 'sig_mock' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Payment already processed');
    expect(db.createPayment).not.toHaveBeenCalled();
  });
});