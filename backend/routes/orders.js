import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../models/database.js';
import { razorpayService } from '../services/razorpay.js';

const router = express.Router();

// Quick buy-now endpoint (simplified checkout)
router.post('/buy-now', authMiddleware, async (req, res) => {
    try {
        const { designIdFront, designIdBack, tshirtSize, quantity = 1, customText, combinedMockupUrl } = req.body;

        if (!designIdFront && !designIdBack) {
            return res.status(400).json({ error: 'At least one design (front or back) is required' });
        }

        // Verify front design belongs to user and is finalized
        if (designIdFront) {
            const frontDesign = await db.getDesignById(designIdFront, req.userId);
            if (!frontDesign) {
                return res.status(404).json({ error: 'Front design not found' });
            }
            if (!frontDesign.is_finalized) {
                return res.status(400).json({ error: 'Front design must be finalized before purchase' });
            }
        }

        // Verify back design belongs to user and is finalized
        if (designIdBack) {
            const backDesign = await db.getDesignById(designIdBack, req.userId);
            if (!backDesign) {
                return res.status(404).json({ error: 'Back design not found' });
            }
            if (!backDesign.is_finalized) {
                return res.status(400).json({ error: 'Back design must be finalized before purchase' });
            }
        }

        // Create order with both design IDs
        const order = await db.createOrder(
            req.userId,
            designIdFront || null,
            designIdBack || null,
            tshirtSize,
            quantity,
            customText,
            combinedMockupUrl || null
        );

        res.json({
            success: true,
            orderId: order.id,
            amountInPaise: order.amount_in_paise,
            amountInRupees: (order.amount_in_paise / 100).toFixed(2)
        });
    } catch (error) {
        console.error('Buy now error:', error);
        res.status(500).json({ error: 'Failed to create order: ' + error.message });
    }
});

// Create order (before payment)
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { designIdFront, designIdBack, tshirtSize, quantity = 1, customText, combinedMockupUrl } = req.body;

        if (!designIdFront && !designIdBack) {
            return res.status(400).json({ error: 'At least one design is required' });
        }

        // Verify front design
        if (designIdFront) {
            const frontDesign = await db.getDesignById(designIdFront, req.userId);
            if (!frontDesign || !frontDesign.is_finalized) {
                return res.status(400).json({ error: 'Front design not finalized' });
            }
        }

        // Verify back design
        if (designIdBack) {
            const backDesign = await db.getDesignById(designIdBack, req.userId);
            if (!backDesign || !backDesign.is_finalized) {
                return res.status(400).json({ error: 'Back design not finalized' });
            }
        }

        // Create order
        const order = await db.createOrder(
            req.userId,
            designIdFront || null,
            designIdBack || null,
            tshirtSize,
            quantity,
            customText,
            combinedMockupUrl || null
        );

        res.json({
            success: true,
            orderId: order.id,
            amountInPaise: order.amount_in_paise,
            amountInRupees: (order.amount_in_paise / 100).toFixed(2)
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order: ' + error.message });
    }
});

// Initiate Razorpay payment
router.post('/initiate-payment', authMiddleware, async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        // Get order
        const order = await db.getOrderById(orderId, req.userId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.razorpay_order_id) {
            return res.status(400).json({ error: 'Payment already initiated' });
        }

        // Get user
        const user = await db.getUserById(req.userId);

        // Create Razorpay order
        const razorpayOrder = await razorpayService.createOrder(
            order.amount_in_paise,
            orderId,
            user.email,
            user.name
        );

        // Save Razorpay order ID
        await db.updateOrderRazorpayId(orderId, razorpayOrder.id);

        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate payment: ' + error.message });
    }
});

// Get order details
router.get('/:orderId', authMiddleware, async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.orderId, req.userId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Get user orders list
router.get('/', authMiddleware, async (req, res) => {
    try {
        const orders = await db.getOrdersByUserId(req.userId);
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

export default router;
