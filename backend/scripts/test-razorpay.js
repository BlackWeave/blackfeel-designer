/**
 * Test Razorpay credentials
 * Run: node backend/scripts/test-razorpay.js
 */

import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

async function testRazorpay() {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    console.log('🔑 Testing Razorpay credentials...');
    console.log('Key ID:', key_id);
    console.log('Key Secret:', key_secret ? '***' + key_secret.slice(-4) : 'MISSING');

    if (!key_id || !key_secret) {
        console.error('❌ Missing credentials in .env');
        return;
    }

    const razorpay = new Razorpay({
        key_id: key_id,
        key_secret: key_secret
    });

    try {
        // Test by fetching orders (lighter than creating one)
        const orders = await razorpay.orders.all({ limit: 1 });
        console.log('✅ Authentication successful!');
        console.log('📦 Recent orders:', orders.items.length);
        console.log('📦 First order:', orders.items[0]?.id || 'No orders yet');
    } catch (error) {
        console.error('❌ Authentication failed!');
        console.error('Error code:', error.code);
        console.error('Status code:', error.statusCode);
        console.error('Error:', error.error || error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
    }
}

testRazorpay();
