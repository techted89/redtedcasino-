import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
    createUser,
    getUser,
    getAllUsers,
    getUserByUsername,
    recordWithdrawal,
    updatePaytable,
    updateUserPassword,
    setUserBalance,
    getWithdrawalRequests,
    updateWithdrawalRequestStatus,
    getGameStatistics,
    getGameConfiguration
} from '../database/operations.js';
import { config } from '../config.js';
import { checkAuth } from '../middleware/auth.js';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// --- AUTHENTICATION ---

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 10, // Limit each IP to 10 login requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7',
	legacyHeaders: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// Admin login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const user = await getUserByUsername(username);

        // Security: Check if user exists and is an admin before checking password to prevent username enumeration.
        if (!user || !user.isAdmin) {
            return res.status(401).json({ message: 'Authentication failed: Invalid credentials or not an admin' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Authentication failed: Invalid credentials or not an admin' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username, isAdmin: user.isAdmin },
            config.jwtSecret, // Using a centralized secret
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.json({
            message: 'Admin login successful',
            token: token
        });

    } catch (error) {
        console.error('Login error:', error); // Keep detailed log on server
        res.status(500).json({ message: 'An internal server error occurred.' }); // Generic message to client
    }
});

// All routes below this point are protected by the new, shared admin auth middleware.
router.use(checkAuth(true));

// --- GAME MANAGEMENT ---
router.get('/games', (req, res) => {
    // This still comes from config, as game definitions are static. Paytables are now dynamic.
    res.json(Object.values(config.games));
});

// Endpoint to get the full configuration for a game (paytable and weights)
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

// Endpoint to update a game's configuration (paytable and weights) in the database
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

router.post('/users/create', async (req, res) => {
    try {
        const { username, initialBalance, firstName, lastName, age, password } = req.body;
        if (!username || initialBalance === undefined || !firstName || !lastName || !age || !password) {
            return res.status(400).json({ message: 'Username, initialBalance, firstName, lastName, age, and password are required' });
        }
        const newUser = await createUser(username, initialBalance, firstName, lastName, age);

        // After creating the user, set their password
        await updateUserPassword(newUser.id, password);

        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        // Basic duplicate entry check
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

router.post('/users/:userId/withdrawal', async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ message: 'A valid, positive withdrawal amount is required.' });
        }

        const user = await getUser(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance for withdrawal.' });
        }

        const updatedUser = await recordWithdrawal(userId, amount);
        res.json(updatedUser);

    } catch (error) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// --- ADMIN-ONLY BALANCE & WITHDRAWAL MANAGEMENT ---

router.put('/users/:userId/balance', async (req, res) => {
    try {
        const { userId } = req.params;
        const { newBalance } = req.body;
        if (newBalance === undefined || typeof newBalance !== 'number' || newBalance < 0) {
            return res.status(400).json({ message: 'A valid, non-negative new balance is required.' });
        }
        const updatedUser = await setUserBalance(userId, newBalance);
        res.json(updatedUser);
    } catch (error) {
        console.error('Error setting user balance:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

router.get('/withdrawal-requests', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const result = await getWithdrawalRequests(page, limit);
        res.json(result);
    } catch (error) {
        console.error('Error fetching withdrawal requests:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

router.put('/withdrawal-requests/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body; // Expecting 'approved' or 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected".' });
        }
        const adminId = req.user.userId; // The admin performing the action
        const result = await updateWithdrawalRequestStatus(requestId, adminId, status);
        res.json(result);
    } catch (error) {
        console.error('Error updating withdrawal request:', error);
        // Don't leak detailed error messages to the client
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
