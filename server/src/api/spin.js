import { Router } from 'express';
import crypto from 'crypto';
import { getUser, updateUserBalance } from '../database.js';
import { config } from '../config.js'; // Import config

const router = Router();

const symbols = {
    S1: 'http://redtedcasino.com/BearSlot/img/symbol1.png',
    S2: 'http://redtedcasino.com/BearSlot/img/symbol2.png',
    S3: 'http://redtedcasino.com/BearSlot/img/symbol3.png',
    S4: 'http://redtedcasino.com/BearSlot/img/symbol4.png',
    S5: 'http://redtedcasino.com/BearSlot/img/symbol5.png',
    WILD: 'http://redtedcasino.com/BearSlot/img/symbol_wild.png',
    JACKPOT: 'http://redtedcasino.com/BearSlot/img/symbol_jackpot.png'
};

const symbolKeys = Object.keys(symbols);

// Paytable is now in config.js

const generateSpin = () => {
  const reels = [[], [], [], [], []];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      reels[i][j] = symbolKeys[crypto.randomInt(symbolKeys.length)];
    }
  }
  // The result is the middle row of 5 reels
  return [reels[0][1], reels[1][1], reels[2][1], reels[3][1], reels[4][1]];
};

const calculateWinnings = (spinResult, betAmount) => {
    let winnings = 0;
    const line = spinResult;
    const paytable = config.paytable; // Use paytable from config

    // Check for wins for each symbol type
    for (const symbol in paytable) {
        let count = 0;
        // Count consecutive symbols from the left, including wilds
        for (let i = 0; i < line.length; i++) {
            if (line[i] === symbol || (line[i] === 'WILD' && symbol !== 'JACKPOT')) { // Wilds don't substitute for jackpot
                count++;
            } else {
                break; // Stop counting when the chain is broken
            }
        }

        if (paytable[symbol][count]) {
            winnings = Math.max(winnings, paytable[symbol][count] * betAmount);
        }
    }

    return winnings;
};


router.post('/spin', (req, res) => {
  const { betAmount, userId } = req.body;

  if (!betAmount || betAmount <= 0) {
    return res.status(400).json({ message: 'Invalid bet amount' });
  }

  const user = getUser(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.balance < betAmount) {
    return res.status(400).json({ message: 'Insufficient balance' });
  }

  updateUserBalance(userId, -betAmount);

  const spinResultKeys = generateSpin();
  const winnings = calculateWinnings(spinResultKeys, betAmount);

  if (winnings > 0) {
    updateUserBalance(userId, winnings);
  }

  const updatedUser = getUser(userId);
  const spinResultUrls = spinResultKeys.map(key => symbols[key]);

  res.json({
    reels: spinResultUrls,
    winnings,
    newBalance: updatedUser.balance,
  });
});

export default router;
