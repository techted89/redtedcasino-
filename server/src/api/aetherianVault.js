import { Router } from 'express';
import {
    getPlayerAetherProgress,
    getJackpotPools
} from '../database/operations.js';
import { checkAuth } from '../middleware/auth.js';

const router = Router();

// Endpoint to get the current jackpot pools (publicly accessible)
router.get('/jackpots', async (req, res) => {
    try {
        const pools = await getJackpotPools();
        res.json(pools);
    } catch (error) {
        console.error('Error fetching jackpot pools:', error);
        res.status(500).json({ message: 'Failed to get jackpot data.' });
    }
});

// All routes below require authentication
router.use(checkAuth());

// Endpoint to get a player's aether progression
router.get('/aether-progress', async (req, res) => {
    try {
        // req.user is attached by the checkAuth middleware
        const progress = await getPlayerAetherProgress(req.user.walletAddress);
        res.json(progress);
    } catch (error) {
        console.error('Error fetching aether progress:', error);
        res.status(500).json({ message: 'Failed to get player progression.' });
    }
});

export default router;