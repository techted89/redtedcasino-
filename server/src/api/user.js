import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
    forcePasswordChange,
    updateUserProfile,
    createWithdrawalRequest,
    getUserStatus
} from '../database/operations.js';

const router = Router();

// In a real production app, this secret should be a long, complex, and securely stored environment variable.
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-secret-and-complex-key-for-dev';

// Middleware to check for a valid user JWT.
// This is similar to the admin one but doesn't require isAdmin to be true.
const checkUserAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Token is missing' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden: Token is invalid or expired' });
        }
        // Attach the decoded user payload to the request object
        req.user = user;
        next();
    });
};

// All routes in this file are for authenticated users.
router.use(checkUserAuth);

// --- USER STATUS & ONBOARDING ---

// Get the user's onboarding status (password changed, profile completed)
router.get('/status', async (req, res) => {
    try {
        const status = await getUserStatus(req.user.userId);
        if (!status) {
            return res.status(404).json({ message: 'User status not found.' });
        }
        res.json(status);
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Endpoint for the mandatory password change
router.post('/update-password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }
        const result = await forcePasswordChange(req.user.userId, newPassword);
        res.json(result);
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Endpoint for the mandatory profile completion
router.post('/update-profile', async (req, res) => {
    try {
        const { firstName, lastName, age } = req.body;
        if (!firstName || !lastName || !age) {
            return res.status(400).json({ message: 'First name, last name, and age are required.' });
        }
        const updatedUser = await updateUserProfile(req.user.userId, { firstName, lastName, age });
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// --- USER ACTIONS ---

router.post('/request-withdrawal', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ message: 'A valid, positive withdrawal amount is required.' });
        }
        // Further validation (e.g., checking user balance) should happen here or in the DB operation
        const result = await createWithdrawalRequest(req.user.userId, amount);
        res.json(result);
    } catch (error) {
        console.error('Error creating withdrawal request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


export default router;
