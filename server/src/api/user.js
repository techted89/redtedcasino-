import { Router } from 'express';
import {
    forcePasswordChange,
    updateUserProfile,
    createWithdrawalRequest,
    getUserStatus
} from '../database/operations.js';
import { checkAuth } from '../middleware/auth.js';

const router = Router();

// All routes in this file are for authenticated users.
// We use the shared middleware, configured to not require admin privileges.
router.use(checkAuth());

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
