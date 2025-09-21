import { Router } from 'express';
import crypto from 'crypto';
import { getUser, updateUserBalance } from '../database/operations.js'; // Updated path
import { config } from '../config.js';

const router = Router();

// ... (generateSpin and calculateWinnings are unchanged) ...
const generateSpin = (gameConfig) => {
  const symbolKeys = Object.keys(gameConfig.symbols);
  const reels = [[], [], [], [], []];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      reels[i][j] = symbolKeys[crypto.randomInt(symbolKeys.length)];
    }
  }
  return [reels[0][1], reels[1][1], reels[2][1], reels[3][1], reels[4][1]];
};
const calculateWinnings = (spinResult, betAmount, gameConfig) => {
    let winnings = 0;
    const line = spinResult;
    const paytable = gameConfig.paytable;
    for (const symbol in paytable) {
        let count = 0;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === symbol || (line[i] === 'WILD' && symbol !== 'JACKPOT')) {
                count++;
            } else {
                break;
            }
        }
        if (paytable[symbol] && paytable[symbol][count]) {
            winnings = Math.max(winnings, paytable[symbol][count] * betAmount);
        }
    }
    return winnings;
};


router.post('/spin', async (req, res) => { // Now async
    try {
        const { userId, betAmount, gameId } = req.body;

        if (!userId || !betAmount || !gameId) {
            return res.status(400).json({ message: 'userId, betAmount, and gameId are required' });
        }

        const gameConfig = config.games[gameId];
        if (!gameConfig) {
            return res.status(404).json({ message: 'Game not found' });
        }

        const user = await getUser(userId); // Awaited
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.balance < betAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // The database operations are now atomic and sequential
        await updateUserBalance(userId, -betAmount);

        const spinResultKeys = generateSpin(gameConfig);
        const winnings = calculateWinnings(spinResultKeys, betAmount, gameConfig);

        let finalBalance = user.balance - betAmount;

        if (winnings > 0) {
            const updatedUser = await updateUserBalance(userId, winnings);
            finalBalance = updatedUser.balance;
        }

        const spinResultUrls = spinResultKeys.map(key => gameConfig.symbols[key]);

        res.json({
            reels: spinResultUrls,
            winnings,
            newBalance: finalBalance,
        });

    } catch (error) {
        console.error('Spin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
