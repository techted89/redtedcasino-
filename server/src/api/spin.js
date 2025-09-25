import { Router } from 'express';
import crypto from 'crypto';
import { getUser, updateUserBalance, getGameConfiguration, updateGameStatistics } from '../database/operations.js';
import { config } from '../config.js';

const router = Router();

const generateWeightedSpin = (gameConfig, symbolWeights) => {
    const weightedSymbols = [];
    // The Object.keys check handles cases where symbolWeights might be null, undefined, or an empty object
    if (symbolWeights && Object.keys(symbolWeights).length > 0) {
        for (const symbol in symbolWeights) {
            // Ensure the symbol exists in the main game config to prevent mismatches
            if (gameConfig.symbols[symbol]) {
                const weight = symbolWeights[symbol];
                for (let i = 0; i < weight; i++) {
                    weightedSymbols.push(symbol);
                }
            } else {
                // Log a warning for the administrator if a weight is defined for a non-existent symbol
                console.error(`Configuration Error: The symbol '${symbol}' has a weight defined but does not exist in the gameConfig.symbols for this game.`);
            }
        }
    }

    // Fallback to unweighted spin if the weighted array is empty
    // This handles misconfigurations where weights are defined but are all zero, or symbols don't match.
    if (weightedSymbols.length === 0) {
        console.warn(`Warning: No valid symbol weights found for game. Falling back to unweighted spin.`);
        const symbolKeys = Object.keys(gameConfig.symbols);
        return Array.from({ length: 5 }, () => symbolKeys[crypto.randomInt(symbolKeys.length)]);
    }

    // Generate the 5-reel spin result from the weighted array
    const spinResult = [];
    for (let i = 0; i < 5; i++) {
        const randomIndex = crypto.randomInt(weightedSymbols.length);
        spinResult.push(weightedSymbols[randomIndex]);
    }
    return spinResult;
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

        // --- Fetch the dynamic game configuration from the database ---
        const { paytable, symbolWeights } = await getGameConfiguration(gameId);

        const user = await getUser(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.balance < betAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Deduct bet amount
        await updateUserBalance(userId, -betAmount);

        const spinResultKeys = generateWeightedSpin(gameConfig, symbolWeights);
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
            return res.status(500).json({ message: `Configuration error for this game. Please contact an admin.` });
        }
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

export default router;
