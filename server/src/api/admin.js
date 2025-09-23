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
    updateUserPassword
} from '../database/operations.js';
import { config } from '../config.js';

const router = Router();

// In a real production app, this secret should be a long, complex, and securely stored environment variable.
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-secret-and-complex-key-for-dev';

// --- AUTHENTICATION ---

// Admin login
router.post('/login', async (req, res) => {
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
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.json({
            message: 'Admin login successful',
            token: token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Middleware to check for a valid JWT
const checkAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Token is missing' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden: Token is invalid or expired' });
        }
        // Attach the decoded user payload to the request object
        req.user = user;
        next();
    });
};

// All routes below this point are protected
router.use(checkAuth);

// --- GAME MANAGEMENT ---
router.get('/games', (req, res) => {
    // This still comes from config, as game definitions are static. Paytables are now dynamic.
    res.json(Object.values(config.games));
});

// Endpoint to update a game's paytable in the database
router.put('/games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { paytable } = req.body;

        if (!config.games[gameId]) {
            return res.status(404).json({ message: 'Game not found in static config' });
        }
        if (!paytable) {
            return res.status(400).json({ message: 'Paytable data is required' });
        }

        const result = await updatePaytable(gameId, paytable);
        res.json({ message: result.message });

    } catch (error) {
        console.error(`Error updating paytable for ${req.params.gameId}:`, error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// --- USER MANAGEMENT ---

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
        res.status(500).json({ message: 'Internal server error' });
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
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
