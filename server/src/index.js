import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';

// API Routers
import spinRouter from './api/spin.js';
import adminRouter from './api/admin.js';
import userRouter from './api/user.js';
// Database Operations
import { getUserByUsername } from './database/operations.js';

// Config
import { config } from './config.js';

const app = express();

// In a real production app, this secret should be a long, complex, and securely stored environment variable.
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-secret-and-complex-key-for-dev';

app.use(express.json());

// --- CORS Configuration ---
// This must be placed before any routes are defined.
const corsOptions = {
  origin: 'http://redtedcasino.com',
  optionsSuccessStatus: 200 // For legacy browser support
};
app.use(cors(corsOptions));

// --- USER AUTHENTICATION (now secure) ---
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const user = await getUserByUsername(username);

        // Security: Check if user exists. We don't check for admin status here.
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Admins should not use this login form.
        if (user.isAdmin) {
             return res.status(403).json({ message: 'Admin login is handled separately. Please use the admin portal.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT for the regular user
        const token = jwt.sign(
            { userId: user.id, username: user.username, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '8h' } // Longer expiration for regular users
        );

        // Exclude password from the user object returned to the client
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --- GAME API (Public) ---
app.get('/api/games', (req, res) => {
    const gamesList = Object.values(config.games).map(game => ({
        id: game.id,
        name: game.name,
        backgroundImage: game.backgroundImage
    }));
    res.json(gamesList);
});

// --- API ROUTERS ---
app.use('/api', spinRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);

// --- Static file serving for the client ---
// This assumes the client files are in a directory named 'client' at the root
// This is a common setup for single-page applications.
app.use(express.static('client'));

app.get('/', (req, res) => {
  res.redirect('/index.html'); // Redirect root to the main client page
});

export default app; // Export the app for testing
