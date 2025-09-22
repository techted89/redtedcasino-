import { Router } from 'express';
import {
    createUser,
    updateUserBalance,
    getUser,
    getAllUsers
} from '../database/operations.js';
import { config, __UNSAFE_updateGameConfig } from '../config.js';

const router = Router();

// In a real app, this token would be a signed JWT and have an expiration.
const MOCK_ADMIN_TOKEN = 'secret-admin-token';

// Admin login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === config.adminPassword) {
    res.json({
      message: 'Admin login successful',
      token: MOCK_ADMIN_TOKEN
    });
  } else {
    res.status(401).json({ message: 'Authentication failed: Invalid password' });
  }
});

// Middleware to check for admin token
const checkAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token === MOCK_ADMIN_TOKEN) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admin token is missing or invalid' });
  }
};

// All routes below this point are protected
router.use(checkAuth);

// --- Game Management ---
router.get('/games', (req, res) => {
    res.json(Object.values(config.games));
});

// Endpoint to update a game's paytable
router.put('/games/:gameId', (req, res) => {
    const { gameId } = req.params;
    const { paytable } = req.body;

    if (!config.games[gameId]) {
        return res.status(404).json({ message: 'Game not found' });
    }
    if (!paytable) {
        return res.status(400).json({ message: 'Paytable data is required' });
    }

    __UNSAFE_updateGameConfig(gameId, paytable);

    res.json({ message: `Paytable for '${gameId}' updated successfully in memory.` });
});


// --- User Management (now async) ---

router.get('/users', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/users/create', async (req, res) => {
    try {
        const { username, initialBalance } = req.body;
        if (!username || initialBalance === undefined) {
            return res.status(400).json({ message: 'Username and initial balance are required' });
        }
        const newUser = await createUser(username, initialBalance);
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/users/:userId/balance', async (req, res) => {
    try {
        const { userId } = req.params;
        const { newBalance } = req.body;
        if (newBalance === undefined) {
            return res.status(400).json({ message: 'New balance is required' });
        }

        const user = await getUser(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const balanceDifference = newBalance - user.balance;

        const updatedUser = await updateUserBalance(userId, balanceDifference);
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating balance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
