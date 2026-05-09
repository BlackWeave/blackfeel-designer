import pool from '../config/db.js';
import { v4 as uuid } from 'uuid';

export const db = {
    // Users
    async createUser(email, passwordHash, name) {
        const result = await pool.query(
            `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING id, email, name, generations_used, is_finalized`,
            [uuid(), email, passwordHash, name]
        );
        return result.rows[0];
    },

    async getUserByEmail(email) {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    },

    async getUserById(id) {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    },

    async updateUserGenerationCount(userId) {
        const result = await pool.query(
            `UPDATE users SET generations_used = generations_used + 1,
             last_generation_date = NOW(), updated_at = NOW()
             WHERE id = $1
             RETURNING generations_used`,
            [userId]
        );
        return result.rows[0];
    },

    async resetUserDailyLimit(userId) {
        await pool.query(
            `UPDATE users SET generations_used = 0, is_finalized = false, updated_at = NOW()
             WHERE id = $1 AND last_generation_date < CURRENT_DATE`,
            [userId]
        );
    },

    async finalizeUserDesign(userId) {
        await pool.query(
            `UPDATE users SET is_finalized = true, updated_at = NOW() WHERE id = $1`,
            [userId]
        );
    },

    // Designs
    async createDesign(userId, prompt, originalImageUrl, processedImageUrl, tshirtColor) {
        const result = await pool.query(
            `INSERT INTO designs
             (id, user_id, prompt, original_image_url, processed_image_url, tshirt_color, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id, prompt, processed_image_url, tshirt_color`,
            [uuid(), userId, prompt, originalImageUrl, processedImageUrl, tshirtColor]
        );
        return result.rows[0];
    },

    async getDesignsByUserId(userId, limit = 20) {
        const result = await pool.query(
            `SELECT id, prompt, processed_image_url, tshirt_color, is_finalized, created_at
             FROM designs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    },

    async getDesignById(designId, userId = null) {
        const query = userId
            ? 'SELECT * FROM designs WHERE id = $1 AND user_id = $2'
            : 'SELECT * FROM designs WHERE id = $1';
        const params = userId ? [designId, userId] : [designId];
        const result = await pool.query(query, params);
        return result.rows[0];
    },

    async updateDesignPosition(designId, userId, x, y, scale) {
        const result = await pool.query(
            `UPDATE designs SET design_position = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING design_position`,
            [JSON.stringify({ x, y, scale }), designId, userId]
        );
        return result.rows[0];
    },

    async finalizeDesign(designId, userId, finalizedImageUrl) {
        const result = await pool.query(
            `UPDATE designs SET finalized_image_url = $1, is_finalized = true, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING id, finalized_image_url`,
            [finalizedImageUrl, designId, userId]
        );
        return result.rows[0];
    },

    // Orders
    async createOrder(userId, designIdFront, designIdBack, tshirtSize, quantity, customText, combinedMockupUrl) {
        // Pricing: Base ₹499, +₹299 per size tier, +₹100 custom text
        let basePrice = 49900; // ₹499 in paise
        if (tshirtSize && ['L', 'XL', 'XXL'].includes(tshirtSize)) basePrice += 29900;
        if (customText) basePrice += 10000;
        const totalPrice = basePrice * quantity;

        const result = await pool.query(
            `INSERT INTO orders (id, user_id, design_id_front, design_id_back, amount_in_paise, tshirt_size, tshirt_quantity, custom_text, combined_mockup_url, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING id, amount_in_paise, status`,
            [uuid(), userId, designIdFront || null, designIdBack || null, totalPrice, tshirtSize, quantity, customText, combinedMockupUrl || null]
        );
        return result.rows[0];
    },

    async getOrderById(orderId, userId = null) {
        const query = userId
            ? 'SELECT * FROM orders WHERE id = $1 AND user_id = $2'
            : 'SELECT * FROM orders WHERE id = $1';
        const params = userId ? [orderId, userId] : [orderId];
        const result = await pool.query(query, params);
        return result.rows[0];
    },

    async updateOrderStatus(orderId, status) {
        const result = await pool.query(
            `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2
             RETURNING id, status`,
            [status, orderId]
        );
        return result.rows[0];
    },

    async updateOrderRazorpayId(orderId, razorpayOrderId) {
        await pool.query(
            `UPDATE orders SET razorpay_order_id = $1, status = 'payment_pending', updated_at = NOW()
             WHERE id = $2`,
            [razorpayOrderId, orderId]
        );
    },

    async getOrderByRazorpayId(razorpayOrderId) {
        const result = await pool.query(
            'SELECT * FROM orders WHERE razorpay_order_id = $1',
            [razorpayOrderId]
        );
        return result.rows[0];
    },

    // Payments
    async createPayment(orderId, razorpayPaymentId, razorpaySignature, amountInPaise) {
        const result = await pool.query(
            `INSERT INTO payments (id, order_id, razorpay_payment_id, razorpay_signature, amount_in_paise, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'authorized', NOW(), NOW())
             RETURNING id, status`,
            [uuid(), orderId, razorpayPaymentId, razorpaySignature, amountInPaise]
        );
        return result.rows[0];
    },

    async getPaymentByRazorpayId(razorpayPaymentId) {
        const result = await pool.query(
            'SELECT * FROM payments WHERE razorpay_payment_id = $1',
            [razorpayPaymentId]
        );
        return result.rows[0];
    },

    // Webhook Events (idempotency)
    async recordWebhookEvent(razorpayEventId, eventType, payload) {
        const result = await pool.query(
            `INSERT INTO webhook_events (id, razorpay_event_id, event_type, payload, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (razorpay_event_id) DO NOTHING
             RETURNING id`,
            [uuid(), razorpayEventId, eventType, JSON.stringify(payload)]
        );
        return result.rows.length > 0;
    },

    async createFulfillmentJob(orderId) {
        // Fetch full details including both front and back designs
        const orderQuery = `
        SELECT o.id as order_id, o.tshirt_size, o.combined_mockup_url,
               d_front.id as design_id_front, d_front.tshirt_color as front_tshirt_color,
               d_front.finalized_image_url as front_finalized_url,
               d_front.processed_image_url as front_processed_url,
               d_back.id as design_id_back, d_back.tshirt_color as back_tshirt_color,
               d_back.processed_image_url as back_processed_url
        FROM orders o
        LEFT JOIN designs d_front ON o.design_id_front = d_front.id
        LEFT JOIN designs d_back ON o.design_id_back = d_back.id
        WHERE o.id = $1
    `;
        const orderRes = await pool.query(orderQuery, [orderId]);
        const details = orderRes.rows[0];

        // print_mockup_url = combined mockup or front finalized image or back processed
        // raw_design_url_front = transparent front design for printer
        // raw_design_url_back = transparent back design for printer
        // Use front design_id if available, otherwise use back design_id
        const designId = details.design_id_front || details.design_id_back;
        // Use front tshirt_color if available, otherwise use back
        const tshirtColor = details.front_tshirt_color || details.back_tshirt_color;

        const result = await pool.query(
            `INSERT INTO fulfillment_queue
         (order_id, design_id, tshirt_color, tshirt_size, print_mockup_url, raw_design_url_front, raw_design_url_back)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
            [
                details.order_id,
                designId,
                tshirtColor,
                details.tshirt_size,
                details.combined_mockup_url || details.front_finalized_url || details.back_processed_url,
                details.front_processed_url || null,
                details.back_processed_url || null
            ]
        );
        return result.rows[0];
    },

    async updateFulfillmentRawDesignUrl(orderId, rawDesignUrl, side = 'front') {
        const column = side === 'back' ? 'raw_design_url_back' : 'raw_design_url_front';
        return await pool.query(
            `UPDATE fulfillment_queue SET ${column} = $1 WHERE order_id = $2`,
            [rawDesignUrl, orderId]
        );
    },

    async markWebhookProcessed(razorpayEventId) {
        await pool.query(
            `UPDATE webhook_events SET processed = true WHERE razorpay_event_id = $1`,
            [razorpayEventId]
        );
    },

    async getOrdersByUserId(userId) {
        const result = await pool.query(
            `SELECT
                o.id,
                o.amount_in_paise,
                o.status,
                o.tshirt_size,
                o.tshirt_quantity,
                o.created_at,
                o.combined_mockup_url,
                o.design_id_front,
                o.design_id_back,
                d_front.processed_image_url AS front_processed_image_url,
                d_front.finalized_image_url AS front_finalized_image_url,
                d_front.tshirt_color AS front_tshirt_color,
                d_front.prompt AS front_prompt,
                d_back.processed_image_url AS back_processed_image_url,
                d_back.finalized_image_url AS back_finalized_image_url,
                d_back.tshirt_color AS back_tshirt_color,
                d_back.prompt AS back_prompt
             FROM orders o
             LEFT JOIN designs d_front ON o.design_id_front = d_front.id
             LEFT JOIN designs d_back ON o.design_id_back = d_back.id
             WHERE o.user_id = $1
             ORDER BY o.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    async getOrderWithDesign(razorpayOrderId) {
        const result = await pool.query(
            `SELECT o.*, 
                    d_front.processed_image_url as processed_image_url,
                    d_back.processed_image_url as back_processed_image_url
             FROM orders o 
             LEFT JOIN designs d_front ON o.design_id_front = d_front.id 
             LEFT JOIN designs d_back ON o.design_id_back = d_back.id
             WHERE o.razorpay_order_id = $1`,
            [razorpayOrderId]
        );
        return result.rows[0];
    }
};
