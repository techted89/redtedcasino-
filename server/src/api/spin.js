import { Router } from 'express';
import crypto from 'crypto';
import { getUser, updateUserBalance, getGameConfiguration, updateGameStatistics } from '../database/operations.js';
import { config } from '../config.js';

const router = Router();

// --- Game Logic for 3x3 Reel Games ---

const generateWeightedSpin3x3 = (gameConfig, symbolWeights) => {
    const weightedSymbols = [];
    if (symbolWeights && Object.keys(symbolWeights).length > 0) {
        for (const symbol in symbolWeights) {
            if (gameConfig.symbols[symbol]) {
                const weight = symbolWeights[symbol];
                for (let i = 0; i < weight; i++) {
                    weightedSymbols.push(symbol);
                }
            } else {
                console.error(`Configuration Error: The symbol '${symbol}' has a weight defined but does not exist in the gameConfig.symbols for this game.`);
            }
        }
    }

    if (weightedSymbols.length === 0) {
        console.warn(`Warning: No valid symbol weights found for game. Falling back to unweighted spin.`);
        const symbolKeys = Object.keys(gameConfig.symbols);
        return Array.from({ length: 5 }, () => symbolKeys[crypto.randomInt(symbolKeys.length)]);
    }

    const spinResult = [];
    for (let i = 0; i < 5; i++) {
        const randomIndex = crypto.randomInt(weightedSymbols.length);
        spinResult.push(weightedSymbols[randomIndex]);
    }
    return spinResult;
};

const calculateWinnings3x3 = (spinResult, betAmount, paytable) => {
    let winnings = 0;
    const line = spinResult;
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

// --- Game Logic for 5x1 Reel Games (like Solana Slot) ---

const generateSpin5x1 = (gameConfig) => {
    const symbolKeys = Object.keys(gameConfig.symbols);
    const spinResult = [];
    for (let i = 0; i < 5; i++) {
        const randomIndex = crypto.randomInt(symbolKeys.length);
        spinResult.push(symbolKeys[randomIndex]);
    }
    return spinResult;
};

const calculateWinnings5x1 = (spinResult, betAmount, paytable) => {
    const winningSymbol = spinResult[0];
    let consecutiveCount = 1;
    for (let i = 1; i < spinResult.length; i++) {
        if (spinResult[i] === winningSymbol) {
            consecutiveCount++;
        } else {
            break;
        }
    }

    if (paytable[winningSymbol] && paytable[winningSymbol][consecutiveCount]) {
        return paytable[winningSymbol][consecutiveCount] * betAmount;
    }

    return 0;
};


// --- Main Spin Endpoint ---

router.post('/spin', async (req, res) => {
    try {
        const { userId, betAmount, gameId } = req.body;

        if (!userId || !betAmount || !gameId) {
            return res.status(400).json({ message: 'userId, betAmount, and gameId are required' });
        }

        const gameConfig = config.games[gameId];
        if (!gameConfig) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // --- Fetch dynamic game config, with fallback to static config ---
        let paytable, symbolWeights;
        try {
            // Try to get config from the database first.
            const dbConfig = await getGameConfiguration(gameId);
            paytable = dbConfig.paytable;
            symbolWeights = dbConfig.symbolWeights;
        } catch (error) {
            // If it fails (e.g., game not in DB), use the default config.
            console.warn(`Could not find a dynamic configuration for game '${gameId}'. Falling back to default config. Error: ${error.message}`);
            paytable = gameConfig.paytable;
            symbolWeights = undefined; // No weighted spin for default configs.
        }

        // After attempting to get the paytable from DB or config, check if it exists.
        if (!paytable) {
            return res.status(500).json({ message: `No paytable configured for game '${gameId}'. Please contact an admin.` });
        }


        const user = await getUser(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.balance < betAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        await updateUserBalance(userId, -betAmount);

        let spinResultKeys;
        let winnings;

        // Use gameType to determine which logic to apply
        switch (gameConfig.gameType) {
            case '5x1':
                spinResultKeys = generateSpin5x1(gameConfig);
                winnings = calculateWinnings5x1(spinResultKeys, betAmount, paytable);
                break;
            case '3x3':
            default: // Default to existing logic
                spinResultKeys = generateWeightedSpin3x3(gameConfig, symbolWeights);
                winnings = calculateWinnings3x3(spinResultKeys, betAmount, paytable);
                break;
        }

        let finalBalance = user.balance - betAmount;
        if (winnings > 0) {
            const updatedUser = await updateUserBalance(userId, winnings);
            finalBalance = updatedUser.balance;
        }

        // Map keys to URLs or names based on config
        const spinResult = spinResultKeys.map(key => gameConfig.symbols[key]);

        updateGameStatistics(gameId, betAmount, winnings).catch(err => {
            console.error(`Failed to update statistics for game ${gameId}:`, err);
        });

        res.json({
            reels: spinResult,
            winnings,
            newBalance: finalBalance,
        });

    } catch (error) {
        console.error('Spin error:', error);
        if (error.message.includes('not found in database')) {
            return res.status(500).json({ message: `Configuration error for this game. Please contact an admin.` });
        }
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

export default router;