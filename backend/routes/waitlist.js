import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/db.js';

const router = express.Router();

/**
 * POST /api/waitlist
 * Saves an early-access survey submission to the waitlist_entries table.
 * Returns { success: true } on success, or a suitable error.
 */
router.post(
    '/',
    [
        body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'),
        body('pain_point').notEmpty().withMessage('pain_point is required.'),
        body('workflow').notEmpty().withMessage('workflow is required.'),
        body('frequency').notEmpty().withMessage('frequency is required.'),
    ],
    async (req, res) => {
        // Validate inputs
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, pain_point, workflow, frequency, source } = req.body;

        // Best-effort IP capture (useful for dedup / analytics)
        const ip =
            req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket?.remoteAddress ||
            null;

        try {
            // INSERT … ON CONFLICT DO NOTHING so duplicate submissions are silently absorbed
            const result = await pool.query(
                `INSERT INTO waitlist_entries (email, pain_point, workflow, frequency, source, ip_address)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (email) DO NOTHING
                 RETURNING id`,
                [
                    email,
                    pain_point || null,
                    workflow || null,
                    frequency || null,
                    source || 'waitlist_landing_v1',
                    ip,
                ]
            );

            // result.rowCount === 0 means the email already existed — treat as success
            return res.status(200).json({ success: true, alreadyRegistered: result.rowCount === 0 });
        } catch (err) {
            console.error('[Waitlist] DB error:', err.message);
            return res.status(500).json({ error: 'Failed to save your details. Please try again.' });
        }
    }
);

/**
 * GET /api/waitlist/count  (optional convenience endpoint for admin dashboards)
 */
router.get('/count', async (_req, res) => {
    try {
        const { rows } = await pool.query('SELECT COUNT(*) AS total FROM waitlist_entries');
        return res.json({ total: parseInt(rows[0].total, 10) });
    } catch (err) {
        console.error('[Waitlist] Count error:', err.message);
        return res.status(500).json({ error: 'Could not fetch count.' });
    }
});

export default router;
