import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

// API Routers
import adminRouter from './api/admin.js';
import aetherianVaultRouter from './api/aetherianVault.js';
import onchainRouter from './api/onchain.js';
// Database Operations
import { getUserByWalletAddress, createUserWithWallet } from './database/operations.js';

// Config
import { config } from './config.js';

const app = express();

// Use the centralized secret from the config file.
app.use(helmet());
app.use(express.json());

// --- CORS Configuration ---
// This must be placed before any routes are defined.
const corsOptions = {
  origin: 'http://redtedcasino.com',
  optionsSuccessStatus: 200 // For legacy browser support
};
app.use(cors(corsOptions));

// --- Web3 User Authentication ---
app.post('/api/users/login-web3', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
            return res.status(400).json({ message: 'A valid walletAddress is required' });
        }

        // Find or create the user in the database
        let user = await getUserByWalletAddress(walletAddress);
        if (!user) {
            user = await createUserWithWallet(walletAddress);
        }

        // Generate JWT for the user session
        const token = jwt.sign(
            { walletAddress: user.walletAddress, isAdmin: user.isAdmin },
            config.jwtSecret,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Web3 login successful',
            token,
            user
        });

    } catch (error) {
        console.error('Web3 login error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// --- GAME API (Public) ---
app.get('/api/games', (req, res) => {
    const gamesList = Object.values(config.games).map(game => ({
        id: game.id,
        name: game.name,
        backgroundImage: game.backgroundImage,
        gameUrl: game.gameUrl // Include the gameUrl for client-side routing
    }));
    res.json(gamesList);
});

// --- API ROUTERS ---
app.use('/api', aetherianVaultRouter);
app.use('/api', onchainRouter); // Mount the new on-chain router
app.use('/api/admin', adminRouter);

// --- Static file serving for the client ---
// This assumes the client files are in a directory named 'client' at the root
// This is a common setup for single-page applications.
app.use(express.static('client'));

app.get('/', (req, res) => {
  res.redirect('/index.html'); // Redirect root to the main client page
});

export default app; // Export the app for testing
