import { Router } from 'express';
import crypto from 'crypto';
import { getUser, updateUserBalance, getPaytable, updateGameStatistics } from '../database/operations.js';
import { config } from '../config.js';

const router = Router();

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

// calculateWinnings is now passed the paytable directly
const calculateWinnings = (spinResult, betAmount, paytable) => {
    let winnings = 0;
    const line = spinResult;
    for (const symbol in paytable) {
        let count = 0;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === symbol || (line[i] === 'WILD' && symbol !== 'JACKPOT')) {
                count++;
            } else {
                break; // Stop counting once a non-matching symbol is found
            }
        }
        if (paytable[symbol] && paytable[symbol][count]) {
            winnings = Math.max(winnings, paytable[symbol][count] * betAmount);
        }
    }
    return winnings;
};


router.post('/spin', async (req, res) => {
    try {
        const { userId, betAmount, gameId } = req.body;

        if (!userId || !betAmount || !gameId) {
            return res.status(400).json({ message: 'userId, betAmount, and gameId are required' });
        }

        // Get the static part of the game config (name, symbols, etc.)
        const gameConfig = config.games[gameId];
        if (!gameConfig) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // --- Fetch the dynamic paytable from the database ---
        const paytable = await getPaytable(gameId);

        const user = await getUser(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.balance < betAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Deduct bet amount
        await updateUserBalance(userId, -betAmount);

        const spinResultKeys = generateSpin(gameConfig);
        // Pass the database-fetched paytable to the winnings calculation
        const winnings = calculateWinnings(spinResultKeys, betAmount, paytable);

        let finalBalance = user.balance - betAmount;

        if (winnings > 0) {
            const updatedUser = await updateUserBalance(userId, winnings);
            finalBalance = updatedUser.balance;
        }

        const spinResultUrls = spinResultKeys.map(key => gameConfig.symbols[key]);

        // --- Update Game Statistics ---
        // This is done asynchronously and we don't need to wait for it to finish
        // before responding to the user, so we don't use await.
        updateGameStatistics(gameId, betAmount, winnings).catch(err => {
            // Log the error if the statistics update fails for some reason.
            console.error(`Failed to update statistics for game ${gameId}:`, err);
        });

        res.json({
            reels: spinResultUrls,
            winnings,
            newBalance: finalBalance,
        });

    } catch (error) {
        console.error('Spin error:', error);
        // Handle case where paytable is not found in the DB
        if (error.message.includes('not found in database')) {
            return res.status(500).json({ message: `Configuration error: ${error.message}` });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
