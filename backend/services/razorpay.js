import RazorpayModule from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

// Initialize inside a function to ensure process.env is populated
const getRazorpay = () => {
    if (razorpayInstance) return razorpayInstance;

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    console.log('🔑 Razorpay Key ID:', key_id ? `${key_id.substring(0, 8)}...` : 'MISSING');
    console.log('🔑 Razorpay Key Secret:', key_secret ? `${key_secret.substring(0, 8)}...` : 'MISSING');

    if (!key_id || !key_secret) {
        throw new Error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing from .env');
    }

    razorpayInstance = new RazorpayModule({
        key_id: key_id,
        key_secret: key_secret
    });

    console.log('✅ Razorpay instance created successfully');
    return razorpayInstance;
};

export const razorpayService = {
    async createOrder(amountInPaise, orderId, customerEmail, customerName) {
        try {
            console.log(`💳 Creating Razorpay order for ₹${amountInPaise / 100}...`);

            const rzp = getRazorpay();
            
            // Log the order details being sent
            console.log('📦 Order details:', {
                amount: Math.round(amountInPaise),
                currency: 'INR',
                receipt: orderId.substring(0, 40),
                notes: {
                    order_id: orderId,
                    email: customerEmail,
                    name: customerName
                }
            });

            const order = await rzp.orders.create({
                amount: Math.round(amountInPaise), // Must be integer paise
                currency: 'INR',
                receipt: orderId.substring(0, 40), // Receipt limit is 40 chars
                notes: {
                    order_id: orderId,
                    email: customerEmail,
                    name: customerName
                }
            });

            console.log('✅ Razorpay order created:', order.id);
            return order;
        } catch (error) {
            // Log full error details
            console.error('❌ Razorpay full error:', JSON.stringify(error, null, 2));
            console.error('❌ Razorpay error code:', error.code);
            console.error('❌ Razorpay status:', error.statusCode);
            
            // Razorpay errors are often objects, not standard Error instances
            const errorMsg = error.description || error.error?.description || error.message || JSON.stringify(error);
            console.error('Razorpay API Error:', errorMsg);
            throw new Error(errorMsg);
        }
    },

    async verifySignature(orderId, paymentId, signature) {
        try {
            const key_secret = process.env.RAZORPAY_KEY_SECRET;
            const generatedSignature = crypto
                .createHmac('sha256', key_secret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            return generatedSignature === signature;
        } catch (error) {
            console.error('Signature verification error:', error.message);
            return false;
        }
    }
};