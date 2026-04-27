import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../models/database.js';
import { razorpayService } from '../services/razorpay.js';
import { imageStorage } from '../services/imageStorage.js';
import { enhanceService } from '../services/enhanceService.js';

const router = express.Router();

// Verify payment and create payment record
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        // Verify signature
        const isValid = await razorpayService.verifySignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Use the NEW method to get the image URL
        const order_found = await db.getOrderWithDesign(razorpayOrderId);

        if (!order_found || order_found.user_id !== req.userId) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if payment already processed
        const existingPayment = await db.getPaymentByRazorpayId(razorpayPaymentId);
        if (existingPayment) {
            return res.json({
                success: true,
                message: 'Payment already processed',
                orderId: order_found.id
            });
        }

        // Create payment record
        await db.createPayment(
            order_found.id,
            razorpayPaymentId,
            razorpaySignature,
            order_found.amount_in_paise
        );

        // ✨ TRIGGER 4K UPSCALING for front design
        if (order_found.processed_image_url) {
            console.log(`🚀 Upscaling FRONT design for Order ${order_found.id} to 4K print-ready via local script...`);
            try {
                const fileName = `${order_found.id}-front-4k-print.png`;
                const highResR2Url = await enhanceService.enhanceAndUploadToR2(
                    order_found.processed_image_url,
                    fileName
                );
                console.log(`✅ 4K Front Design stored in R2 at: ${highResR2Url}`);

                await db.updateFulfillmentRawDesignUrl(order_found.id, highResR2Url, 'front');
                console.log(`✅ DB updated with high-res front design for fulfillment`);

            } catch (err) {
                console.error("Front high-res upscaling failed, proceeding with order:", err.message);
            }
        }

        // ✨ TRIGGER 4K UPSCALING for back design
        if (order_found.back_processed_image_url) {
            console.log(`🚀 Upscaling BACK design for Order ${order_found.id} to 4K print-ready via local script...`);
            try {
                const fileName = `${order_found.id}-back-4k-print.png`;
                const highResR2Url = await enhanceService.enhanceAndUploadToR2(
                    order_found.back_processed_image_url,
                    fileName
                );
                console.log(`✅ 4K Back Design stored in R2 at: ${highResR2Url}`);

                await db.updateFulfillmentRawDesignUrl(order_found.id, highResR2Url, 'back');
                console.log(`✅ DB updated with high-res back design for fulfillment`);

            } catch (err) {
                console.error("Back high-res upscaling failed, proceeding with order:", err.message);
            }
        }

        await db.updateOrderStatus(order_found.id, 'paid');
        await db.createFulfillmentJob(order_found.id);

        res.json({ success: true, orderId: order_found.id });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// Webhook from Razorpay (for asynchronous processing)
router.post('/webhook', async (req, res) => {
    try {
        const { event, payload } = req.body;
        const razorpayEventId = req.headers['x-razorpay-event-id'];

        if (!razorpayEventId) {
            return res.status(400).json({ error: 'Missing event ID' });
        }

        // Record webhook (idempotent)
        const isNew = await db.recordWebhookEvent(razorpayEventId, event, payload);

        if (!isNew) {
            return res.json({ success: true });
        }

        if (event === 'payment.authorized' || event === 'payment.captured') {
            const { id: razorpay_payment_id, order_id: razorpay_order_id } = payload.payment.entity;

            // Use the NEW method for webhook as well
            const order = await db.getOrderWithDesign(razorpay_order_id);

            if (order) {
                // Check if already paid to avoid duplicate processing
                if (order.status !== 'paid') {
                    await db.createPayment(
                        order.id,
                        razorpay_payment_id,
                        'WEBHOOK_VERIFIED', // Signature not always in webhook payload in same way
                        order.amount_in_paise
                    );

                    await db.updateOrderStatus(order.id, 'paid');

                    // ✨ TRIGGER 4K UPSCALING for Webhook - FRONT
                    if (order.processed_image_url) {
                        try {
                            console.log(`🚀 Webhook: Upscaling FRONT design for Order ${order.id} to 4K print-ready via local script...`);
                            
                            const fileName = `${order.id}-front-4k-print.png`;
                            const highResR2Url = await enhanceService.enhanceAndUploadToR2(
                                order.processed_image_url,
                                fileName
                            );

                            console.log(`✅ Webhook: 4K Front Design stored in R2 at: ${highResR2Url}`);

                            await db.updateFulfillmentRawDesignUrl(order.id, highResR2Url, 'front');
                            console.log(`✅ Webhook: DB updated with high-res front design`);

                        } catch (uploadError) {
                            console.error(`⚠️ Webhook: Failed to upscale front design for order ${order.id}:`, uploadError);
                        }
                    }

                    // ✨ TRIGGER 4K UPSCALING for Webhook - BACK
                    if (order.back_processed_image_url) {
                        try {
                            console.log(`🚀 Webhook: Upscaling BACK design for Order ${order.id} to 4K print-ready via local script...`);
                            
                            const fileName = `${order.id}-back-4k-print.png`;
                            const highResR2Url = await enhanceService.enhanceAndUploadToR2(
                                order.back_processed_image_url,
                                fileName
                            );

                            console.log(`✅ Webhook: 4K Back Design stored in R2 at: ${highResR2Url}`);

                            await db.updateFulfillmentRawDesignUrl(order.id, highResR2Url, 'back');
                            console.log(`✅ Webhook: DB updated with high-res back design`);

                        } catch (uploadError) {
                            console.error(`⚠️ Webhook: Failed to upscale back design for order ${order.id}:`, uploadError);
                        }
                    }

                    console.log(`📦 Webhook verified. Moving Order ${order.id} to Production Queue...`);
                    await db.createFulfillmentJob(order.id);
                }
            }
        }

        // Mark as processed
        await db.markWebhookProcessed(razorpayEventId);

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;