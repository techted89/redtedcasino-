import { Router } from 'express';
import crypto from 'crypto';
import { getUser, updateUserBalance } from '../database.js';
import { config } from '../config.js';

const router = Router();

// This function is now pure and depends on the passed game config
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

// This function is now pure and depends on the passed game config
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

router.post('/spin', (req, res) => {
  const { userId, betAmount, gameId } = req.body;

  // 1. Validate input
  if (!userId || !betAmount || !gameId) {
    return res.status(400).json({ message: 'userId, betAmount, and gameId are required' });
  }

  // 2. Get the game configuration
  const gameConfig = config.games[gameId];
  if (!gameConfig) {
    return res.status(404).json({ message: 'Game not found' });
  }

  // 3. Get user and check balance
  const user = getUser(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (user.balance < betAmount) {
    return res.status(400).json({ message: 'Insufficient balance' });
  }

  // 4. Perform game logic
  updateUserBalance(userId, -betAmount);

  const spinResultKeys = generateSpin(gameConfig);
  const winnings = calculateWinnings(spinResultKeys, betAmount, gameConfig);

  if (winnings > 0) {
    updateUserBalance(userId, winnings);
  }

  // 5. Send response
  const updatedUser = getUser(userId);
  const spinResultUrls = spinResultKeys.map(key => gameConfig.symbols[key]);

  res.json({
    reels: spinResultUrls,
    winnings,
    newBalance: updatedUser.balance,
  });
});

export default router;
