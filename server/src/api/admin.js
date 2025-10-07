import { Router } from 'express';
import {
    getAllUsers,
    updatePaytable,
    getGameStatistics,
    getGameConfiguration
} from '../database/operations.js';
import { config } from '../config.js';
import { checkAuth } from '../middleware/auth.js';

const router = Router();

// All admin routes are protected by the auth middleware, which checks for an admin flag.
// The login flow itself is now handled by the main /api/users/login-web3 endpoint.
router.use(checkAuth(true));

// --- GAME MANAGEMENT ---
router.get('/games', (req, res) => {
    res.json(Object.values(config.games));
});

router.get('/game-config/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        if (!config.games[gameId]) {
            return res.status(404).json({ message: 'Game not found in static config' });
        }
        const configuration = await getGameConfiguration(gameId);
        res.json(configuration);
    } catch (error) {
        console.error(`Error fetching game configuration for ${req.params.gameId}:`, error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

router.put('/games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { paytable, symbolWeights } = req.body;

        if (!config.games[gameId]) {
            return res.status(404).json({ message: 'Game not found in static config' });
        }
        if (!paytable || !symbolWeights) {
            return res.status(400).json({ message: 'Paytable and symbolWeights data are required' });
        }

        const result = await updatePaytable(gameId, paytable, symbolWeights);
        res.json({ message: result.message });

    } catch (error) {
        console.error(`Error updating configuration for ${req.params.gameId}:`, error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});


// --- USER MANAGEMENT ---
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const result = await getAllUsers(page, limit);
        res.json(result);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});


// --- GAME STATISTICS ---
router.get('/statistics', async (req, res) => {
    try {
        const stats = await getGameStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching game statistics:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

export default router;