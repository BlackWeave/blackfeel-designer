import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { db } from '../models/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth Login/Register
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        // Check if user exists
        let user = await db.getUserByEmail(email);

        if (!user) {
            // Generate a secure random password for OAuth users since they don't provide one
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            user = await db.createUser(email, hashedPassword, name);
        }

        // Reset daily limit if it's a new day
        await db.resetUserDailyLimit(user.id);
        const updatedUser = await db.getUserById(user.id);

        // Generate our app's JWT token
        const token = generateToken(updatedUser.id, updatedUser.email);

        res.json({
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                generationsUsed: updatedUser.generations_used,
                isFinalized: updatedUser.is_finalized
            }
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ error: 'Google Authentication failed. Please try again.' });
    }
});

// Register
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name } = req.body;

        // Check if user exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await db.createUser(email, hashedPassword, name);

        // Generate token
        const token = generateToken(user.id, user.email);

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                generationsUsed: user.generations_used,
                isFinalized: user.is_finalized
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        console.error('Error details:', error.message, error.stack);
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
});

// Login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Get user
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Reset daily limit if new day
        await db.resetUserDailyLimit(user.id);

        // Refresh user data
        const updatedUser = await db.getUserById(user.id);

        // Generate token
        const token = generateToken(updatedUser.id, updatedUser.email);

        res.json({
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                generationsUsed: updatedUser.generations_used,
                isFinalized: updatedUser.is_finalized
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await db.getUserById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Reset daily limit if new day
        await db.resetUserDailyLimit(user.id);
        const updatedUser = await db.getUserById(user.id);

        res.json({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            generationsUsed: updatedUser.generations_used,
            isFinalized: updatedUser.is_finalized
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

export default router;
