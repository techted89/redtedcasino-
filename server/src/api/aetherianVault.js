import { Router } from 'express';
import {
    getUser,
    updateUserBalance,
    getPlayerAetherProgress,
    updatePlayerAetherProgress,
    updateJackpotPool,
    getJackpotPools
} from '../database/operations.js';
import { config } from '../config.js';
import { checkAuth } from '../middleware/auth.js';

const router = Router();

const AETHER_LEVELS = {
    1: { name: 'Steady Flow', pointThreshold: 100 },
    2: { name: 'Rift Shift', pointThreshold: 250 },
    3: { name: 'Crystal Surge', pointThreshold: 500 },
    4: { name: 'Power Link', pointThreshold: 1000 },
    5: { name: 'Vault Overdrive', pointThreshold: null } // Max level
};

// This would be in a separate, more complex module in a real app
const generateSpinResult = (aetherLevel) => {
    // Placeholder for a much more complex function that would
    // generate the 5x4 reel matrix based on the current aetherLevel
    // and any active Temporal Flux modes.

    // For now, return a dummy result for testing
    const symbols = Object.keys(config.games['aetherian-vault'].symbols);
    const result = {
        reels: Array.from({ length: 20 }, () => symbols[Math.floor(Math.random() * symbols.length)]),
        winnings: Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 0,
        aetherShardsFound: Math.floor(Math.random() * 4)
    };
    return result;
};


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
        const progress = await getPlayerAetherProgress(req.user.userId);
        res.json(progress);
    } catch (error) {
        console.error('Error fetching aether progress:', error);
        res.status(500).json({ message: 'Failed to get player progression.' });
    }
});


router.post('/spin/aetherian-vault', async (req, res) => {
    try {
        const { betAmount } = req.body; // userId is now from the token
        const { userId } = req.user;

        if (!betAmount) {
            return res.status(400).json({ message: 'betAmount is required' });
        }

        const user = await getUser(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.balance < betAmount) return res.status(400).json({ message: 'Insufficient balance' });

        // --- Core Game Logic ---
        // 1. Deduct bet from user's balance
        await updateUserBalance(userId, -betAmount);

        // 2. Add a percentage of the bet to the jackpot pools
        const jackpotContribution = betAmount * 0.01; // 1% of each bet goes to jackpots
        updateJackpotPool('minor', jackpotContribution * 0.5).catch(console.error);
        updateJackpotPool('major', jackpotContribution * 0.3).catch(console.error);
        updateJackpotPool('grand', jackpotContribution * 0.2).catch(console.error);

        // 3. Get player's current progression
        const progress = await getPlayerAetherProgress(userId);

        // 4. Generate the spin result based on player's level
        const spinResult = generateSpinResult(progress.aetherLevel);

        // 5. Handle Aether Shard progression
        let newProgress = progress;
        if (spinResult.aetherShardsFound > 0) {
            const pointsToAdd = spinResult.aetherShardsFound * (spinResult.aetherShardsFound >= 3 ? 2 : 1);
            newProgress = await updatePlayerAetherProgress(userId, pointsToAdd);

            // Check for level up
            const currentLevelInfo = AETHER_LEVELS[newProgress.aetherLevel];
            if (currentLevelInfo.pointThreshold && newProgress.aetherPoints >= currentLevelInfo.pointThreshold) {
                newProgress = await updatePlayerAetherProgress(userId, 0, newProgress.aetherLevel + 1);
            }
        }

        // 6. Add winnings to user's balance
        let finalBalance = user.balance - betAmount;
        if (spinResult.winnings > 0) {
            const updatedUser = await updateUserBalance(userId, spinResult.winnings);
            finalBalance = updatedUser.balance;
        }

        res.json({
            reels: spinResult.reels,
            winnings: spinResult.winnings,
            newBalance: finalBalance,
            aetherProgress: newProgress
        });

    } catch (error) {
        console.error('Aetherian Vault spin error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

export default router;